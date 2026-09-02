import fs from 'fs';
import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

export interface IPackageTranslationsOptions {
  sourceDir?: string;
  outputDir?: string;
  namespaces?: string[];
  locales?: string[];
}

export interface IPackageTranslationsResult {
  sourceDir: string;
  outputDir: string;
  namespaces: string[];
  locales: string[];
  totalFilesCopied: number;
  copiedFiles: string[];
  missingFiles: string[];
  errors: Array<{ path: string; error: string }>;
}

const DEFAULT_CORE_NAMESPACES = ['common', 'forms', 'models', 'services', 'workflow', 'schemas', 'cli'];
const FALLBACK_DEFAULT_NAMESPACE = 'reactory';

/**
 * Resolves the source i18n directory from environment variables or sensible fallbacks.
 */
export const resolveSourceI18nDir = (explicitSourceDir?: string): string => {
  if (explicitSourceDir && fs.existsSync(explicitSourceDir)) {
    return explicitSourceDir;
  }
  if (process.env.REACTORY_DATA && fs.existsSync(path.join(process.env.REACTORY_DATA, 'i18n'))) {
    return path.join(process.env.REACTORY_DATA, 'i18n');
  }
  if (process.env.APP_DATA_ROOT && fs.existsSync(path.join(process.env.APP_DATA_ROOT, 'i18n'))) {
    return path.join(process.env.APP_DATA_ROOT, 'i18n');
  }
  // Try relative to workspace
  const relativeData = path.resolve(process.cwd(), '../reactory-data/i18n');
  if (fs.existsSync(relativeData)) {
    return relativeData;
  }
  const localData = path.resolve(process.cwd(), 'data/i18n');
  return localData;
};

/**
 * Parses and resolves namespaces from I18N_NS and defaults.
 */
export const resolveNamespaces = (envNamespaces?: string, explicitNamespaces?: string[]): string[] => {
  const nsSet = new Set<string>(DEFAULT_CORE_NAMESPACES);

  if (explicitNamespaces && explicitNamespaces.length > 0) {
    explicitNamespaces.forEach((ns) => {
      if (ns && ns.trim()) nsSet.add(ns.trim());
    });
  } else if (envNamespaces && envNamespaces.trim().length > 0) {
    envNamespaces.split(',').forEach((ns) => {
      const trimmed = ns.trim();
      if (trimmed.length > 0) nsSet.add(trimmed);
    });
  } else {
    // If missing/empty, always at least ship 'reactory'
    nsSet.add(FALLBACK_DEFAULT_NAMESPACE);
  }

  // Ensure reactory is included if no specific custom namespace was found
  if (nsSet.size === DEFAULT_CORE_NAMESPACES.length) {
    nsSet.add(FALLBACK_DEFAULT_NAMESPACE);
  }

  return Array.from(nsSet);
};

/**
 * Discovers locale directories within the source i18n directory.
 */
export const discoverLocales = (sourceDir: string): string[] => {
  if (!fs.existsSync(sourceDir)) return ['en-US'];
  try {
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    const locales = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name);
    return locales.length > 0 ? locales : ['en-US'];
  } catch (err: any) {
    logger.warn(`[package-translations] Could not read source directory ${sourceDir}: ${err.message}`);
    return ['en-US'];
  }
};

/**
 * Packages and copies translation files from the source directory to the build output directory.
 */
export async function packageTranslations(
  options: IPackageTranslationsOptions = {}
): Promise<IPackageTranslationsResult> {
  const startTime = Date.now();
  console.log('🌐 Starting Reactory i18n Translation Packaging...');

  const sourceDir = resolveSourceI18nDir(options.sourceDir);
  const outputDir = options.outputDir
    ? path.resolve(options.outputDir)
    : path.resolve(
        process.cwd(),
        `build/server/${process.env.REACTORY_CONFIG_ID || 'reactory'}/${process.env.REACTORY_ENV_ID || 'local'}/data/i18n`
      );

  const namespaces = resolveNamespaces(process.env.I18N_NS, options.namespaces);
  const locales = options.locales && options.locales.length > 0 ? options.locales : discoverLocales(sourceDir);

  console.log(`📁 Source i18n Directory: ${sourceDir}`);
  console.log(`📦 Target i18n Directory: ${outputDir}`);
  console.log(`🏷️  Namespaces (${namespaces.length}): ${namespaces.join(', ')}`);
  console.log(`🌍 Locales (${locales.length}): ${locales.join(', ')}`);

  const copiedFiles: string[] = [];
  const missingFiles: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  if (!fs.existsSync(sourceDir)) {
    const msg = `Source i18n directory does not exist: ${sourceDir}`;
    console.warn(`⚠️  ${msg}`);
    return {
      sourceDir,
      outputDir,
      namespaces,
      locales,
      totalFilesCopied: 0,
      copiedFiles,
      missingFiles,
      errors: [{ path: sourceDir, error: msg }],
    };
  }

  for (const locale of locales) {
    const localeSourceDir = path.join(sourceDir, locale);
    const localeTargetDir = path.join(outputDir, locale);

    if (!fs.existsSync(localeSourceDir)) {
      continue;
    }

    if (!fs.existsSync(localeTargetDir)) {
      fs.mkdirSync(localeTargetDir, { recursive: true });
    }

    for (const ns of namespaces) {
      const sourceFile = path.join(localeSourceDir, `${ns}.json`);
      const targetFile = path.join(localeTargetDir, `${ns}.json`);

      if (fs.existsSync(sourceFile)) {
        try {
          fs.copyFileSync(sourceFile, targetFile);
          copiedFiles.push(`${locale}/${ns}.json`);
        } catch (err: any) {
          const errMsg = `Failed to copy ${sourceFile} to ${targetFile}: ${err.message}`;
          console.error(`❌ ${errMsg}`);
          errors.push({ path: sourceFile, error: errMsg });
        }
      } else {
        missingFiles.push(`${locale}/${ns}.json`);
      }
    }
  }

  console.log(`✅ Copied ${copiedFiles.length} translation file(s) across ${locales.length} locale(s) in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  if (missingFiles.length > 0) {
    console.log(`ℹ️  ${missingFiles.length} namespace file(s) were not present in source (expected for non-configured namespaces).`);
  }

  return {
    sourceDir,
    outputDir,
    namespaces,
    locales,
    totalFilesCopied: copiedFiles.length,
    copiedFiles,
    missingFiles,
    errors,
  };
}

// Support CLI direct invocation: babel-node package-translations.ts [outputDir]
if (require.main === module) {
  let outputDir: string | undefined;
  let sourceDir: string | undefined;
  let nsList: string[] | undefined;

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--') continue;
    if (arg.startsWith('--output=')) {
      outputDir = arg.split('=')[1];
    } else if (arg.startsWith('--source=')) {
      sourceDir = arg.split('=')[1];
    } else if (arg.startsWith('--ns=') || arg.startsWith('--namespaces=')) {
      nsList = arg.split('=')[1].split(',');
    } else if (arg === '-o' || arg === '--output') {
      outputDir = process.argv[++i];
    } else if (arg === '-s' || arg === '--source') {
      sourceDir = process.argv[++i];
    } else if (!arg.startsWith('-') && !outputDir) {
      outputDir = arg;
    }
  }

  packageTranslations({
    outputDir,
    sourceDir,
    namespaces: nsList,
  })
    .then((result) => {
      console.log(`\n🏁 Result: ${result.totalFilesCopied} translation files packaged successfully.`);
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('💥 Fatal error during translations packaging:', err);
      process.exit(1);
    });
}

export default packageTranslations;
