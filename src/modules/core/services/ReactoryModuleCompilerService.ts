import fs from 'fs';
import path from 'path';
import Rollup from 'rollup';
import { forEach, isArray, takeRight } from 'lodash';
import modules from '@reactory/server-core/modules';
import { resolveInclude } from 'ejs';
import messages from 'bot/sparky/messages';
import { cwd } from 'process';
import Reactory from "@reactory/reactory-core";

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const rollup = require('rollup');
const loadingConfigFile = require('rollup/dist/loadConfigFile');

/**
 * Service class that provides access to forms for the logged in user
 */

interface IRollupOptions {
  outputFile: string,
  inputFile: string,
  enviroment: string,
  moduleName: string,
}

const DefaultRollupOptions = (options: IRollupOptions) => `
/**
 * DO NOT EDIT THIS FILE, IT IS AUTO GENERATED AND WILL BE 
 * OVERWRITTEN EVERY TIME THE SOURCE PLUGIN FILE CHANGES
 **/
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";
import typescript from "@rollup/plugin-typescript";
const jsx = require('rollup-plugin-jsx');

const NODE_ENV = process.env.NODE_ENV || "development";

export default {
  input: "${options.inputFile}",
  output: {
    file: "${options.outputFile}",
    name: "${options.moduleName}",
    format: "umd",
    globals: ['React', 'window'],    
  },

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify("development")
    }),
    commonjs({
      include: 'node_modules/**',
      exclude: [
        'node_modules/process-es6/**',
      ],
      namedExports: {
        'node_modules/react/index.js': ['Component', 'PureComponent', 'Fragment', 'Children', 'createElement'],
        'node_modules/react-dom/index.js': ['render']
      }
    }),
    typescript({ sourceMap: false }),
    babel({
      exclude: 'node_modules/**',
      include: ['./src/**/*.ts', './src/**/*.js', './src/**/*.tsx'],
      runtimeHelpers: true,
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      babelrc: false,
      presets: [
        [
          "@babel/env",
          {
            modules: false,
          }
        ],

        [
          "@babel/react",
        ],

        [
          "@babel/typescript",
        ]
      ],
      plugins: ["@babel/plugin-proposal-class-properties"],
    }),
    jsx({ factory: 'React.createElement' }),
    resolve(),
  ],
};
`

class ReactoryModuleCompilerService implements Reactory.Service.IReactoryModuleCompilerService {
  
  name: string = "ReactoryModuleCompilerService";
  nameSpace: string = "core";
  version: string = "1.0.0";

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;

  fileService: Reactory.Service.IReactoryFileService;


  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }
  
  async compileModule(module: Reactory.Forms.IReactoryFormModule): Promise<Reactory.Forms.IReactoryFormResource> {
    
    const that = this;

    const runtimePath = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__');
    const libPath = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__', 'lib');
    const srcPath = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__', 'src');

    if (!fs.existsSync(runtimePath)) fs.mkdirSync(runtimePath, {  recursive: true });
    if (!fs.existsSync(libPath)) fs.mkdirSync(libPath, { recursive: true } );
    if (!fs.existsSync(srcPath)) fs.mkdirSync(srcPath, { recursive: true });
    
    const sourceFile: string = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__', `src/source_${module.id}.${module.fileType}`);
    const compiledFile: string = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__', `lib/${module.id}.min.js`);
    const newSource: string = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__', `src/tmp_${module.id}.${module.fileType}`);    
    let doCompile: boolean = false;
    let checksum: string = '';

    fs.writeFileSync(newSource, module.src);

    if (fs.existsSync(sourceFile) === false || fs.existsSync(compiledFile) === false) {
      doCompile = true;
    } else {  
      checksum = await this.fileService.generateFileChecksum(sourceFile, 'sha1').then();
      let newChecksum = await this.fileService.generateFileChecksum(newSource, 'sha1').then();      
      if (newChecksum !== checksum) {
        doCompile = true;
        checksum = newChecksum;
      }
    }

    const compileWithRollup = async (): Promise<{ success: boolean, messages: string[] }> => {

      const results: any = {
        messages: [],
        success: false
      }

      fs.writeFileSync(sourceFile, module.src);
      // create a bundle
      const $config = DefaultRollupOptions({
        enviroment: process.env.NODE_ENV || "development",
        inputFile: sourceFile,
        outputFile: compiledFile,
        moduleName: `reactory-plugin-${module.id.replace(".", "-").replace("@", "-")}`,
      });

      const rollupConfigFile: string = path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__', `rollup.${module.id}.dev.js`);
      fs.writeFileSync(rollupConfigFile, $config);
      try {
        const { stdout, stderr, error } = await exec(`npx rollup --config rollup.${module.id}.dev.js`,
          {
            cwd: path.join(process.env.APP_DATA_ROOT, 'plugins', '__runtime__'),
            encoding: 'utf8'
          },
        );
        that.context.log(`Compiled resource ${module.id}`, { stdout, stderr, error }, 'debug', ReactoryModuleCompilerService.reactory.id);      // This prints all deferred warnings                
        if (fs.existsSync(compiledFile) === true) {
          results.success = true;
        }
      } catch (err) {        
        that.context.log('Error executing shell command', { err }, 'error')
      }


      // const { options, warnings } = await loadingConfigFile(rollupConfigFile).then();


      // // "warnings" wraps the default `onwarn` handler passed by the CLI.
      // // This prints all warnings up to this point:

      // //warnings.flush();



      // async function* writeBundles() {
      //   debugger
      //   for (let i = 0; i < options.length; i++) {
      //     const optionsObj: Rollup.RollupOptions = options[i];
      //     try {
      //       debugger

      //       const bundle = await rollup.rollup(optionsObj).then();

      //       debugger
      //       const bundlePromises = optionsObj.output.map((outputOption: Rollup.OutputOptions) => {
      //         that.context.log(`Writing bundle buildPromise`, { outputOption }, 'debug');
      //         return bundle.write(outputOption);
      //       });

      //       const bundleWriteResult: any[] = await Promise.all(bundlePromises).then();
      //       results.messages.push(`wrote bundle #${i}`);
      //       yield bundleWriteResult;
      //     } catch (buildErrors) {
      //       debugger
      //       that.context.log(`ROLUP COMPILER ERROR`, { buildErrors }, 'error', ReactoryFormService.reactory.id);
      //       results.messages.push(`Error compiling module ${buildErrors.message}`);
      //       yield null
      //     }
      //   }

      //   return;
      // }

      // // You can also pass this directly to "rollup.watch"              
      // that.context.log(`Rollup compiling module ${module.id}`); // an array of file names this bundle depends on
      // for await (const bundledResults of writeBundles()) {
      //   if (bundledResults !== null) {
      //     that.context.log('Bundle Results', bundledResults, 'debug', ReactoryFormService.reactory.id);
      //   }
      // }

      // options is an array of "inputOptions" objects with an additional "output"
      // property that contains an array of "outputOptions".
      // The following will generate all outputs for all inputs, and write them to disk the same
      // way the CLI does it:

      return results;
    }


    if (doCompile === true) {
      const result = await compileWithRollup().then();
      if (result.success === false) {
        let notifications = [];
        notifications.push(`$reactory.createNotification("Compilation error on module ${module.id}, see console log for details", { type: 'warning' });`)
        let compilerErrors: string[] = [];
        result.messages.forEach((message) => {
          // `$reactory.log("${message}", { compilationError: true }, "error");`
          that.context.log('Error compiling module', {message}, 'error');
          compilerErrors.push(message);
        });

        let failureScript = ` 
          if(window && window.reactory) {
            var $reactory = window.reactory.api;
            ${notifications.map((n) => `${n};\n`)}
            ${compilerErrors.map((compilerResult) => `$reactory.log("Compilation Failure for ${module.id} --> [${compilerResult}]", { module: ${JSON.stringify(module)} }, 'error');\n`)}            
          }
        `;
        fs.writeFileSync(compiledFile, failureScript);
      }
    }

    /**
     * The module compiler MUST return a valid compiled resource
     */
    const resource: Reactory.Forms.IReactoryFormResource = {
      name: 'Compiled Runtime',
      type: 'script',
      uri: `${process.env.CDN_ROOT}plugins/__runtime__/lib/${module.id}.min.js?cs=${checksum}`,
      id: module.id,
      signature: checksum,
      signatureMethod: 'sha1',
      crossOrigin: '',
      signed: true,
      expr: '',
      required: true
    };

    //always remove the temp file
    fs.unlinkSync(newSource);

    return resource;
    
  }

  onStartup(): Promise<any> {    
    return Promise.resolve(true);
  }
  
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }
  
  static reactory: Reactory.Service.IReactoryServiceDefinition = {
    id: 'core.ReactoryModuleCompilerService@1.0.0',
    description: 'Reactory Module Compiler Service',
    name: 'ReactoryModuleCompilerService',
    service: (props, context) => {
      return new ReactoryModuleCompilerService(props, context)
    },
    dependencies: [
      {
        id: 'core.ReactoryFileService@1.0.0',
        alias: 'fileService'
      }      
    ],
  }

}

export default ReactoryModuleCompilerService;