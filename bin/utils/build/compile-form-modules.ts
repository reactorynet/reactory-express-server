import fs from 'fs';
import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import modules from '@reactory/server-core/modules';
import ReactoryModuleCompilerService from '@reactory/server-modules/reactory-core/services/ReactoryModuleCompilerService';
import logger from '@reactory/server-core/logging';

export interface ICompileFormModulesOptions {
  rsyncOutputFile?: string;
  force?: boolean;
}

export interface ICompileFormModulesResult {
  totalForms: number;
  formsWithModules: number;
  totalModules: number;
  compiled: number;
  failed: number;
  artifacts: string[];
  errors: Array<{ id: string; error: string }>;
  rsyncFilterPath: string;
}

/**
 * Loads all YAML forms from the $REACTORY_DATA/forms directory.
 */
const scanYamlForms = (): Reactory.Forms.IReactoryForm[] => {
  const reactoryData = (process.env.REACTORY_DATA && fs.existsSync(process.env.REACTORY_DATA))
    ? process.env.REACTORY_DATA
    : (process.env.APP_DATA_ROOT && fs.existsSync(process.env.APP_DATA_ROOT))
      ? process.env.APP_DATA_ROOT
      : (process.env.REACTORY_DATA || process.env.APP_DATA_ROOT);
  if (!reactoryData) return [];
  const dir = path.join(reactoryData, 'forms');
  if (!fs.existsSync(dir)) return [];
  const results: Reactory.Forms.IReactoryForm[] = [];
  try {
    const yaml = require('js-yaml');
    const files: string[] = fs.readdirSync(dir).filter((f: string) => /\.ya?ml$/i.test(f));
    for (const file of files) {
      try {
        const parsed = yaml.load(fs.readFileSync(path.join(dir, file), 'utf8'));
        if (parsed && typeof parsed === 'object') {
          results.push(parsed as Reactory.Forms.IReactoryForm);
        }
      } catch (err: any) {
        logger.warn(`[compile-form-modules] Skipping unparseable YAML form ${file}: ${err.message}`);
      }
    }
  } catch (err: any) {
    logger.warn(`[compile-form-modules] Failed scanning forms directory ${dir}: ${err.message}`);
  }
  return results;
};

/**
 * Enumerate all forms across enabled modules and YAML files,
 * extract and deduplicate all form modules/widgets,
 * compile each module via ReactoryModuleCompilerService,
 * and generate an rsync filter file for bundling/deploying.
 */
export async function compileAllFormModules(
  options: ICompileFormModulesOptions = {}
): Promise<ICompileFormModulesResult> {
  const startTime = Date.now();
  console.log('🚀 Starting Reactory Form Modules Pre-compilation...');

  // Initialize server execution context
  const context = await ReactoryContextProvider(null, {
    host: 'cli',
  });

  const compilerService = new ReactoryModuleCompilerService({}, context);
  await compilerService.onStartup();

  const allForms = new Map<string, Reactory.Forms.IReactoryForm>();
  let formsWithModulesCount = 0;

  // 1. Collect code-defined forms from enabled modules
  if (Array.isArray(modules.enabled)) {
    modules.enabled.forEach((mod) => {
      if (Array.isArray(mod.forms)) {
        mod.forms.forEach((form) => {
          if (form && form.id) {
            allForms.set(form.id, form);
          }
        });
      }
    });
  }

  // 2. Merge YAML forms
  const yamlForms = scanYamlForms();
  yamlForms.forEach((form) => {
    if (form && form.id) {
      if (!allForms.has(form.id)) {
        allForms.set(form.id, form);
      } else {
        // Merge modules if YAML provides additional/overridden modules
        const existing = allForms.get(form.id);
        if (Array.isArray(form.modules) && form.modules.length > 0) {
          existing.modules = form.modules;
        }
      }
    }
  });

  // 3. Enumerate unique modules to compile
  const modulesToCompile = new Map<string, Reactory.Forms.IReactoryFormModule>();
  allForms.forEach((form) => {
    if (Array.isArray(form.modules) && form.modules.length > 0) {
      formsWithModulesCount += 1;
      form.modules.forEach((mod) => {
        if (mod && mod.id && !modulesToCompile.has(mod.id)) {
          modulesToCompile.set(mod.id, mod);
        }
      });
    }
  });

  console.log(`📋 Total forms evaluated: ${allForms.size}`);
  console.log(`📑 Forms with widget modules: ${formsWithModulesCount}`);
  console.log(`📦 Unique form modules/widgets to compile: ${modulesToCompile.size}`);

  const artifacts: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  let compiledCount = 0;

  // 4. Compile each module
  for (const [id, formModule] of modulesToCompile.entries()) {
    try {
      console.log(`🔨 Compiling form module: ${id}...`);
      const resource = await compilerService.compileModule(formModule);
      if (resource && (!resource.uri || !resource.uri.includes('error=true'))) {
        compiledCount += 1;
        artifacts.push(`${id}.min.js`);
        artifacts.push(`${id}.min.js.map`);
        console.log(`   ✅ Success: ${id}`);
      } else {
        const errMsg = `Compiler service returned error resource for ${id}`;
        errors.push({ id, error: errMsg });
        console.error(`   ❌ Failed: ${id}`);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      errors.push({ id, error: errMsg });
      console.error(`   ❌ Exception compiling ${id}: ${errMsg}`);
    }
  }

  // 5. Generate Rsync Filter File
  const rsyncTarget = options.rsyncOutputFile || path.resolve(process.cwd(), 'bin/build.runtime-plugins.rsync');
  const rsyncTargetDir = path.dirname(rsyncTarget);
  if (!fs.existsSync(rsyncTargetDir)) {
    fs.mkdirSync(rsyncTargetDir, { recursive: true });
  }

  const rsyncContent = [
    '# Auto-generated by Reactory Build - Form Modules Rsync Filter',
    '# Include directory structure',
    '+ */',
    '# Include compiled form module bundles and source maps',
    ...artifacts.map((file) => `+ ${file}`),
    '# Exclude any unreferenced artifacts in lib directory',
    '- *',
    '',
  ].join('\n');

  fs.writeFileSync(rsyncTarget, rsyncContent, 'utf8');
  console.log(`📝 Generated rsync filter at: ${rsyncTarget}`);
  console.log(`⏱️  Completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  return {
    totalForms: allForms.size,
    formsWithModules: formsWithModulesCount,
    totalModules: modulesToCompile.size,
    compiled: compiledCount,
    failed: errors.length,
    artifacts,
    errors,
    rsyncFilterPath: rsyncTarget,
  };
}

// Support CLI direct invocation: babel-node compile-form-modules.ts [rsyncOutputFile]
if (require.main === module) {
  let rsyncOut: string | undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--') continue;
    if (arg.startsWith('--output=')) {
      rsyncOut = arg.split('=')[1];
    } else if (arg.startsWith('--rsync=')) {
      rsyncOut = arg.split('=')[1];
    } else if (arg === '-o' || arg === '--output' || arg === '--rsync') {
      rsyncOut = process.argv[++i];
    } else if (!arg.startsWith('-') && !rsyncOut) {
      rsyncOut = arg;
    }
  }
  compileAllFormModules({ rsyncOutputFile: rsyncOut })
    .then((result) => {
      console.log(
        `\n🏁 Result: ${result.compiled}/${result.totalModules} modules compiled successfully (${result.failed} failures).`
      );
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('💥 Fatal error during form modules compilation:', err);
      process.exit(1);
    });
}

export default compileAllFormModules;
