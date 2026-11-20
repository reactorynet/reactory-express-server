#!/usr/bin/env node
'use strict';

/**
 * Playwright browser provisioning smoke test.
 *
 * WHY THIS EXISTS
 * ---------------
 * `playwright` pins a Chromium build per release. Installing the newer *package* does not bring
 * the newer *browser*; the browser comes from `playwright install`. Nothing in this repository
 * used to provision a browser, so `chromium.launch()` failed at first macro use, long after
 * deploy — in the built image the failure was:
 *
 *   browserType.launch: Executable doesn't exist at
 *     /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell
 *
 * This script turns that into a build-time failure. It is deliberately dependency-free (node
 * stdlib + the `playwright` package) so it runs in a production-pruned image, where jest and the
 * dev dependencies are absent.
 *
 * WHAT IT ASSERTS
 * ---------------
 *   1. The installed `playwright` package matches what `package.json` declares — catches a
 *      lockfile/`node_modules` that was not refreshed after a bump.
 *   2. `playwright` and `playwright-core` are the same version — they are published in lockstep
 *      and a split pair resolves browsers from one `browsers.json` but launches from the other.
 *   3. The browser revision the package expects is the revision actually on disk, for BOTH
 *      `chromium` and `chromium_headless_shell`. `headless: true` launches go through the
 *      headless shell, so a provisioned full browser alone is not enough — that asymmetry is
 *      exactly what made the 1.59.1 -> 1.65.1 bump look safe.
 *   4. `chromium.launch({ headless: true })` succeeds, and `browser.version()` equals the version
 *      the package pins. Combined with (3) this makes a browser/binary mismatch loud.
 *   5. Optional (`--navigate`): a real navigation, title read, and PNG screenshot of the loaded
 *      page — the same call sequence `services/playwright/ReactorPlaywrightService` performs.
 *
 * EXIT CODES
 * ----------
 *   0  every check passed
 *   1  a check failed (the reason is printed with an actionable hint)
 *   2  the script itself could not run (playwright not installed, unreadable package.json)
 *
 * USAGE
 * -----
 *   node scripts/verify/playwright-browser-smoke.js
 *   node scripts/verify/playwright-browser-smoke.js --navigate http://127.0.0.1:8080/
 *   node scripts/verify/playwright-browser-smoke.js --navigate <url> --screenshot /tmp/pw.png
 *   node scripts/verify/playwright-browser-smoke.js --json
 *   node scripts/verify/playwright-browser-smoke.js --module-root /path/to/reactory-reactor
 *
 * The same script is baked into the container image as
 * `/usr/local/bin/reactory-playwright-smoke.js` and run as a build step, so an image whose
 * browser provisioning silently stopped working cannot be published.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = {
    moduleRoot: null,
    navigate: null,
    screenshot: null,
    json: false,
    timeoutMs: 30000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--module-root') {
      options.moduleRoot = path.resolve(argv[++i]);
    } else if (arg === '--navigate') {
      options.navigate = argv[++i];
    } else if (arg === '--screenshot') {
      options.screenshot = path.resolve(argv[++i]);
    } else if (arg === '--timeout') {
      options.timeoutMs = Number(argv[++i]);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: node playwright-browser-smoke.js [--navigate <url>] [--screenshot <path>] ' +
          '[--module-root <dir>] [--timeout <ms>] [--json]\n',
      );
      process.exit(0);
    } else {
      throw new Error(`Unrecognised argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Find the directory `playwright` should be resolved from.
 *
 * The script has to work from three places with three different relationships to the installed
 * dependency: the module repo (`scripts/verify/`), a jest run (cwd = module root), and the
 * container image, where it is baked into `/usr/local/bin` while the dependency tree lives in
 * the server root (`/reactory/reactory-express-server`). Rather than encode those, the first
 * candidate that can actually resolve `playwright` wins.
 */
function resolveModuleRoot(explicit) {
  const candidates = [
    explicit,
    process.env.PLAYWRIGHT_SMOKE_MODULE_ROOT,
    process.cwd(),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      require.resolve('playwright', { paths: [candidate] });
      return candidate;
    } catch {
      // try the next candidate
    }
  }

  // Nothing resolved: fall back to the first candidate so the failure message names a real path.
  return candidates[0] || process.cwd();
}

// ── Reporting ────────────────────────────────────────────────────────────────

const report = {
  playwrightVersion: null,
  playwrightCoreVersion: null,
  declaredSpec: null,
  browsersPath: null,
  expected: {},
  found: {},
  launched: false,
  browserVersion: null,
  navigation: null,
  screenshotBytes: null,
  checks: [],
};

function pass(name, detail) {
  report.checks.push({ name, ok: true, detail });
  if (!report.json) {
    process.stdout.write(`[pass] ${name}${detail ? ` — ${detail}` : ''}\n`);
  }
}

function fail(name, detail, hint) {
  report.checks.push({ name, ok: false, detail, hint });
  if (!report.json) {
    // stdout, not stderr: the checks are a sequence and a reader needs them in order. The exit
    // code and the trailing summary on stderr carry the verdict.
    process.stdout.write(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}\n`);
    if (hint) process.stdout.write(`       fix: ${hint}\n`);
  }
}

/** Resolve a module the way the runtime does: from the module root, walking up. */
function resolveFrom(moduleRoot, request) {
  return require.resolve(request, { paths: [moduleRoot] });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Derive the browsers root from the path playwright itself reports.
 *
 * `chromium.executablePath()` returns `<root>/chromium-<rev>/<platform>/...`, so the root is
 * whatever precedes the `chromium-<rev>` segment. Deriving it beats re-implementing playwright's
 * platform-specific cache-directory rules, which cannot drift from the binary this way.
 */
function deriveBrowsersRoot(executablePath) {
  const normalised = executablePath.replace(/\\/g, '/');
  const match = normalised.match(/^(.*)\/chromium-(\d+)(\/|$)/);
  if (!match) return null;
  return { root: match[1], revision: match[2] };
}

function humanBrowsersPath(p) {
  if (p === undefined || p === null || p === '') {
    return `unset — playwright is using its platform default (${defaultBrowsersPathHint()})`;
  }
  if (p === '0') return '0 (browsers bundled inside playwright-core)';
  return p;
}

// ── Checks ───────────────────────────────────────────────────────────────────

/**
 * Find the package.json that DECLARES playwright.
 *
 * It is not always the one next to the installed tree. In the source layout it is the module's
 * own package.json; in the built image the dependency tree is hoisted to the server root
 * (`/reactory/reactory-express-server/node_modules`) while the declaration stays with the module
 * at `app/modules/reactory-reactor/package.json`. Checking only `<root>/package.json` reported a
 * false failure inside the image, so the module directories are searched too.
 */
function findDeclaringPackage(moduleRoot) {
  const candidates = [path.join(moduleRoot, 'package.json')];

  for (const layout of ['app/modules', 'src/modules']) {
    const dir = path.join(moduleRoot, layout);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(path.join(dir, entry.name, 'package.json'));
    }
  }

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    let parsed;
    try {
      parsed = readJson(candidate);
    } catch {
      continue;
    }
    const declared = (parsed.dependencies || {}).playwright
      || (parsed.devDependencies || {}).playwright
      || null;
    if (declared) return { packageJsonPath: candidate, declared };
  }

  return { packageJsonPath: path.join(moduleRoot, 'package.json'), declared: null };
}

function checkPackageAlignment(moduleRoot, playwrightVersion) {
  const { packageJsonPath, declared } = findDeclaringPackage(moduleRoot);
  report.declaredIn = packageJsonPath;
  report.declaredSpec = declared;

  if (!declared) {
    fail(
      'package.json declares playwright',
      `no package.json under ${moduleRoot} (or its app/modules, src/modules) declares playwright`,
      'add playwright to "dependencies" — it is a runtime dependency of ReactorPlaywrightService',
    );
    return;
  }

  // Only an exact pin can be compared without a semver implementation. A range is reported, not
  // failed: the lockfile is the thing that pins it, and npm check / yarn install enforce that.
  const exact = /^\d+\.\d+\.\d+$/.test(declared);
  if (!exact) {
    pass(
      'package.json declares playwright',
      `declared "${declared}" (range — installed ${playwrightVersion})`,
    );
    return;
  }

  if (declared !== playwrightVersion) {
    fail(
      'installed playwright matches package.json',
      `${path.relative(moduleRoot, packageJsonPath) || 'package.json'} pins ${declared} but the installed package is ${playwrightVersion}`,
      'the dependency tree was installed before the version bump — reinstall (yarn install / npm ci)',
    );
    return;
  }

  pass(
    'installed playwright matches package.json',
    `${playwrightVersion} declared in ${packageJsonPath}`,
  );
}

function checkCoreVersionPairing(playwrightVersion, playwrightCoreVersion) {
  if (!playwrightCoreVersion) {
    fail(
      'playwright and playwright-core are present',
      'playwright-core could not be resolved',
      'reinstall the dependency tree',
    );
    return;
  }

  if (playwrightVersion !== playwrightCoreVersion) {
    fail(
      'playwright and playwright-core are the same version',
      `playwright ${playwrightVersion} vs playwright-core ${playwrightCoreVersion}`,
      'a split pair resolves browsers.json from one version and launches the other — reinstall',
    );
    return;
  }

  pass('playwright and playwright-core are the same version', playwrightCoreVersion);
}

/**
 * The pinned revisions the package expects, straight out of playwright-core's browsers.json —
 * the same file the installer and the launcher read.
 */
function expectedRevisions(playwrightCoreRoot) {
  const browsersJson = path.join(playwrightCoreRoot, 'browsers.json');
  if (!fs.existsSync(browsersJson)) return null;
  const { browsers } = readJson(browsersJson);
  const byName = {};
  for (const entry of browsers) byName[entry.name] = entry;
  return byName;
}

function checkRevisionOnDisk(name, expectedEntry, browsersRoot, actualFolderRevisions) {
  const expectedRevision = expectedEntry ? String(expectedEntry.revision) : null;
  report.expected[name] = expectedRevision;
  if (!expectedRevision) {
    fail(`browsers.json lists ${name}`, 'no entry found', 'reinstall the dependency tree');
    return;
  }

  const onDisk = actualFolderRevisions.filter((r) => r.name === name).map((r) => r.revision);
  report.found[name] = onDisk;

  if (onDisk.length === 0) {
    fail(
      `${name} is provisioned`,
      `no ${name}-<revision> directory under ${browsersRoot}`,
      `browsers root ${browsersRoot} ` +
        `(PLAYWRIGHT_BROWSERS_PATH ${humanBrowsersPath(process.env.PLAYWRIGHT_BROWSERS_PATH)}) ` +
        'holds no such directory — run `npx playwright install --with-deps chromium` against this path',
    );
    return;
  }

  if (!onDisk.includes(expectedRevision)) {
    fail(
      `${name} revision matches the package`,
      `package expects ${name}-${expectedRevision}, on disk: ${onDisk.map((r) => `${name}-${r}`).join(', ')}`,
      'the browser cache predates the package — run `npx playwright install chromium` after the bump',
    );
    return;
  }

  pass(
    `${name} revision matches the package`,
    `${name}-${expectedRevision}${expectedEntry.browserVersion ? ` (Chrome ${expectedEntry.browserVersion})` : ''}`,
  );
}

function checkExecutable(executablePath) {
  if (!executablePath) {
    fail('chromium.executablePath() resolves', 'playwright returned no path', 'reinstall playwright');
    return false;
  }

  if (!fs.existsSync(executablePath)) {
    fail(
      'the chromium binary exists at chromium.executablePath()',
      executablePath,
      'run `npx playwright install --with-deps chromium`',
    );
    return false;
  }

  try {
    fs.accessSync(executablePath, fs.constants.X_OK);
  } catch {
    fail(
      'the chromium binary is executable',
      `${executablePath} is not executable for uid ${typeof process.getuid === 'function' ? process.getuid() : 'n/a'}`,
      'chmod -R a+rX on the browsers path',
    );
    return false;
  }

  pass('the chromium binary exists and is executable', executablePath);
  return true;
}

/**
 * Headless launches use the headless shell, whose path playwright does NOT expose through
 * `executablePath()`. It is checked through the directory listing above; this asserts the binary
 * inside it too, so a truncated download cannot pass on the directory name alone.
 */
/**
 * Locate the headless shell binary inside an installed browser directory.
 *
 * The platform subdirectory name is not stable across releases and architectures
 * (`chrome-linux64`, `chrome-linux`, `chrome-headless-shell-linux64`,
 * `chrome-headless-shell-mac-arm64`), so it is searched for by filename instead of guessed.
 */
function findHeadlessShellBinary(dir, depth = 0) {
  if (depth > 3 || !fs.existsSync(dir)) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findHeadlessShellBinary(full, depth + 1);
      if (nested) return nested;
    } else if (entry.name === 'chrome-headless-shell' || entry.name === 'headless_shell') {
      return full;
    }
  }

  return null;
}

function checkHeadlessShellBinary(root, revision) {
  const shellDir = path.join(root, `chromium_headless_shell-${revision}`);
  const altDir = path.join(root, `chromium-headless-shell-${revision}`);
  const found = findHeadlessShellBinary(shellDir) || findHeadlessShellBinary(altDir);

  if (!found) {
    fail(
      'the headless shell binary exists (headless:true launches use it)',
      `no chrome-headless-shell / headless_shell binary under ${shellDir}`,
      'run `npx playwright install chromium` — it installs chromium AND chromium-headless-shell',
    );
    return false;
  }

  pass('the headless shell binary exists (headless:true launches use it)', found);
  return true;
}

function listBrowserFolders(root) {
  if (!root || !fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    // Directory names are `<browser>-<revision>`, and browser names contain underscores
    // (`chromium_headless_shell-1217`) as well as hyphens (`chromium-headless-shell` older
    // releases, `ffmpeg-1011`). Splitting on the LAST `-<digits>` is the only stable rule.
    .map((entry) => entry.name.match(/^(.*)-(\d+)$/))
    .filter(Boolean)
    .map((match) => ({ name: match[1], revision: match[2] }));
}

function defaultBrowsersPathHint() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || os.homedir(), 'ms-playwright');
  }
  return path.join(os.homedir(), '.cache', 'ms-playwright');
}

// ── Launch / navigation ──────────────────────────────────────────────────────

async function checkLaunch(chromium, expectedVersion, timeoutMs) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: timeoutMs });
  } catch (error) {
    const firstLine = String(error && error.message ? error.message : error).split('\n')[0];
    fail(
      'chromium.launch({ headless: true }) succeeds',
      firstLine,
      'this is the failure the smoke test exists to catch — provision the browser that matches the package',
    );
    return null;
  }

  const version = browser.version();
  report.launched = true;
  report.browserVersion = version;

  if (!version || typeof version !== 'string') {
    fail('browser.version() reports a version', String(version), 'unexpected playwright behaviour');
    return browser;
  }

  if (expectedVersion && version !== expectedVersion) {
    fail(
      'browser.version() matches the pinned build',
      `launched ${version}, browsers.json pins ${expectedVersion}`,
      'the launched binary is not the build the package pins — reinstall the browser',
    );
    return browser;
  }

  pass(
    'chromium.launch({ headless: true }) succeeds',
    `Chrome ${version}${expectedVersion ? ' (matches browsers.json)' : ''}`,
  );
  return browser;
}

async function checkNavigation(browser, url, screenshotPath, timeoutMs) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  context.setDefaultTimeout(timeoutMs);
  const page = await context.newPage();

  const response = await page.goto(url, { waitUntil: 'load' });
  const title = await page.title();
  const finalUrl = page.url();
  const status = response ? response.status() : null;

  const buffer = await page.screenshot({ fullPage: false, type: 'png' });
  const isPng = buffer.length > 8
    && buffer[0] === 0x89
    && buffer.toString('latin1', 1, 4) === 'PNG';

  if (screenshotPath) {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    fs.writeFileSync(screenshotPath, buffer);
  }

  report.navigation = { url: finalUrl, status, title };
  report.screenshotBytes = buffer.length;

  if (!isPng) {
    fail('page.screenshot() returns a PNG', `${buffer.length} bytes, bad signature`, 'unexpected playwright behaviour');
  } else {
    pass('page.screenshot() returns a PNG', `${buffer.length} bytes${screenshotPath ? ` -> ${screenshotPath}` : ''}`);
  }

  if (!title) {
    fail('the navigated page has a title', `empty title for ${finalUrl}`, 'check the target URL is reachable');
  } else {
    pass('the navigated page has a title', `"${title}" (status ${status})`);
  }

  await context.close();
  return { title, status, finalUrl, bytes: buffer.length };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv.slice(2));
  options.moduleRoot = resolveModuleRoot(options.moduleRoot);
  report.json = options.json;
  report.moduleRoot = options.moduleRoot;

  let playwrightEntry;
  try {
    playwrightEntry = resolveFrom(options.moduleRoot, 'playwright');
  } catch (error) {
    process.stderr.write(
      `[playwright-smoke] FAIL: cannot resolve "playwright" from ${options.moduleRoot}\n` +
        `                 ${String(error && error.message ? error.message : error)}\n`,
    );
    return 2;
  }

  const playwrightRoot = path.dirname(playwrightEntry);
  const playwrightVersion = readJson(path.join(playwrightRoot, 'package.json')).version;
  report.playwrightVersion = playwrightVersion;

  const coreEntry = resolveFrom(options.moduleRoot, 'playwright-core');
  const coreRoot = path.dirname(coreEntry);
  const playwrightCoreVersion = readJson(path.join(coreRoot, 'package.json')).version;
  report.playwrightCoreVersion = playwrightCoreVersion;

  checkPackageAlignment(options.moduleRoot, playwrightVersion);
  checkCoreVersionPairing(playwrightVersion, playwrightCoreVersion);

  const revisions = expectedRevisions(coreRoot);
  const { chromium } = require(playwrightEntry);

  const executablePath = chromium.executablePath();
  const derived = deriveBrowsersRoot(executablePath);
  const browsersRoot = derived ? derived.root : defaultBrowsersPathHint();
  report.browsersPath = browsersRoot;
  report.browsersPathEnv = humanBrowsersPath(process.env.PLAYWRIGHT_BROWSERS_PATH);

  const onDisk = listBrowserFolders(browsersRoot);

  if (revisions) {
    checkRevisionOnDisk('chromium', revisions.chromium, browsersRoot, onDisk);
    checkRevisionOnDisk(
      'chromium_headless_shell',
      revisions['chromium-headless-shell'],
      browsersRoot,
      onDisk,
    );
  } else {
    fail('playwright-core/browsers.json is readable', coreRoot, 'reinstall the dependency tree');
  }

  const executableOk = checkExecutable(executablePath);
  const expectedShellRevision = revisions && revisions['chromium-headless-shell']
    ? String(revisions['chromium-headless-shell'].revision)
    : derived && derived.revision;
  const shellOk = expectedShellRevision
    ? checkHeadlessShellBinary(browsersRoot, expectedShellRevision)
    : false;

  // Launching with no executable present is pointless noise; report the structural failures only.
  if (!executableOk || !shellOk) {
    return finish(1);
  }

  const expectedVersion = revisions && revisions.chromium ? revisions.chromium.browserVersion : null;
  const browser = await checkLaunch(chromium, expectedVersion, options.timeoutMs);

  if (!browser) {
    return finish(1);
  }

  try {
    if (options.navigate) {
      await checkNavigation(browser, options.navigate, options.screenshot, options.timeoutMs);
    }
  } catch (error) {
    fail(
      `real navigation to ${options.navigate}`,
      String(error && error.message ? error.message : error).split('\n')[0],
      'the browser launched but could not drive a page — this is not provisioning',
    );
  } finally {
    await browser.close();
  }

  const failed = report.checks.some((check) => !check.ok);
  return finish(failed ? 1 : 0);
}

function finish(code) {
  if (report.json) {
    process.stdout.write(`${JSON.stringify({ ok: code === 0, code, ...report }, null, 2)}\n`);
  } else if (code === 0) {
    process.stdout.write(
      `\n[playwright-smoke] OK — playwright ${report.playwrightVersion}, ` +
        `Chrome ${report.browserVersion}, browsers at ${report.browsersPath}\n`,
    );
  } else {
    process.stderr.write(
      `\n[playwright-smoke] FAILED — playwright ${report.playwrightVersion}, ` +
        `browsers at ${report.browsersPath} ` +
        `(PLAYWRIGHT_BROWSERS_PATH=${report.browsersPathEnv})\n`,
    );
  }
  return code;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(
      `[playwright-smoke] FAIL: unhandled error — ${String(error && error.stack ? error.stack : error)}\n`,
    );
    process.exitCode = 2;
  });
