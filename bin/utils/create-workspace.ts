'use strict';
import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { colors } from './helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EnabledModule {
  id?: string;
  key?: string;
  name?: string;
  fqn?: string;
  moduleEntry?: string;
  license?: string;
  git?: string;
  shop?: string;
}

interface WorkspaceFolder {
  name: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Emoji map for known module keys
// ---------------------------------------------------------------------------
const EMOJI_MAP: Record<string, string> = {
  'reactory-telemetry':    '📡',
  'reactory-azure':        '☁️',
  'reactory-reactor':      '⚛️',
  'reactory-queue':        '📬',
  'reactory-slack':        '💬',
  'reactory-kyc':          '🪪',
  'reactory-communicator': '📣',
  'reactory-kb':           '📖',
  'reactory-classroom':    '🏫',
};

const DEFAULT_EMOJI = '🧩';

// ---------------------------------------------------------------------------
// Keys already hard-coded as fixed folders in the EJS template — skip them
// to avoid duplicates in the generated workspace.
// ---------------------------------------------------------------------------
const FIXED_FOLDER_KEYS = new Set([
  'reactory-core',
  'reactory-express-server',
  'reactory-pwa-client',
  'reactory-native',
  'reactory-data',
]);

// ---------------------------------------------------------------------------
// Locate the server root  (mirrors install-modules.sh heuristic)
// ---------------------------------------------------------------------------
function findServerRoot(): string {
  const envRoot = process.env.REACTORY_SERVER;
  if (envRoot && fs.existsSync(envRoot)) return envRoot;

  // Running from bin/utils/ (two levels deep)
  const fromUtils = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(fromUtils, 'src', 'modules', 'available.json'))) {
    return fromUtils;
  }

  // Running from bin/ (one level deep)
  const fromBin = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(fromBin, 'src', 'modules', 'available.json'))) {
    return fromBin;
  }

  // Running from the server root itself
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'src', 'modules', 'available.json'))) {
    return cwd;
  }

  return '';
}

// ---------------------------------------------------------------------------
// Parse CLI args  (--key=value  or  --key value)
// ---------------------------------------------------------------------------
function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      args[key] = val ?? argv[i + 1] ?? '';
      if (val === undefined) i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(rawArgs: string[]) {
  const args = parseArgs(rawArgs);

  // Config name can be bare positional arg or --config_name flag
  const positional = rawArgs.find(a => !a.startsWith('--'));
  const configName: string = args['config_name'] ?? positional ?? 'reactory';

  const serverRoot = findServerRoot();
  if (!serverRoot) {
    console.error(colors.error(
      'Cannot locate reactory-express-server root. ' +
      'Run from inside the server directory or set REACTORY_SERVER.'
    ));
    process.exit(1);
  }

  const enabledFile  = path.join(serverRoot, 'src', 'modules', `enabled-${configName}.json`);
  const templateFile = path.join(serverRoot, 'bin', 'utils', 'code-workspace.ejs');
  const workspaceRoot = path.dirname(serverRoot);
  const outputFile   = args['out'] ?? path.join(workspaceRoot, `${configName}.code-workspace`);

  console.log(colors.info(`\n── Reactory Workspace Generator ──\n`));
  console.log(colors.info(`Config       : ${colors.bold(configName)}`));
  console.log(colors.info(`Enabled file : ${enabledFile}`));
  console.log(colors.info(`Template     : ${templateFile}`));
  console.log(colors.info(`Output       : ${outputFile}\n`));

  // -- Validate prerequisites -----------------------------------------------

  if (!fs.existsSync(enabledFile)) {
    console.error(colors.error(`Enabled modules file not found: ${enabledFile}`));
    const available = fs.readdirSync(path.dirname(enabledFile))
      .filter(f => f.startsWith('enabled-') && f.endsWith('.json'))
      .map(f => f.replace('enabled-', '').replace('.json', ''));
    if (available.length) {
      console.error(colors.warn(`Available configs: ${available.join(', ')}`));
    }
    process.exit(1);
  }

  if (!fs.existsSync(templateFile)) {
    console.error(colors.error(`EJS template not found: ${templateFile}`));
    process.exit(1);
  }

  // -- Read enabled modules --------------------------------------------------

  let modules: EnabledModule[];
  try {
    modules = JSON.parse(fs.readFileSync(enabledFile, 'utf8'));
  } catch (err: any) {
    console.error(colors.error(`Failed to read/parse ${enabledFile}: ${err.message}`));
    process.exit(1);
  }

  console.log(colors.info(`Found ${modules.length} module(s) in ${configName} config`));

  // -- Build additionalFolders -----------------------------------------------

  const additionalFolders: WorkspaceFolder[] = [];

  for (const mod of modules) {
    const key = mod.key ?? mod.id;
    if (!key) {
      console.warn(colors.warn(`Skipping module with no key/id: ${JSON.stringify(mod)}`));
      continue;
    }

    if (FIXED_FOLDER_KEYS.has(key)) {
      console.log(colors.info(`Skipping ${key} (already in template fixed folders)`));
      continue;
    }

    const emoji    = EMOJI_MAP[key] ?? DEFAULT_EMOJI;
    const label    = mod.name ? `${emoji} ${mod.name}` : `${emoji} ${key}`;
    const folderPath = `./reactory-express-server/src/modules/${key}`;

    additionalFolders.push({ name: label, path: folderPath });
    console.log(colors.info(`+ ${label}  →  ${folderPath}`));
  }

  // -- Render EJS template ---------------------------------------------------

  const template = fs.readFileSync(templateFile, 'utf8');
  let rendered: string;
  try {
    rendered = ejs.render(template, { additionalFolders }, { filename: templateFile });
  } catch (err: any) {
    console.error(colors.error(`EJS render error: ${err.message}`));
    process.exit(1);
  }

  // -- Validate JSON output --------------------------------------------------

  try {
    JSON.parse(rendered);
  } catch (err: any) {
    const debugFile = `${outputFile}.debug`;
    fs.writeFileSync(debugFile, rendered, 'utf8');
    console.error(colors.error(`Rendered output is not valid JSON: ${err.message}`));
    console.error(colors.error(`Debug output written to: ${debugFile}`));
    process.exit(1);
  }

  // -- Write output ----------------------------------------------------------

  fs.writeFileSync(outputFile, rendered, 'utf8');
  console.log(colors.info(`\n✔  Workspace file written to ${outputFile}`));
  console.log(colors.info(`\n   Open with: code "${outputFile}"\n`));
}

main(process.argv.slice(2));
