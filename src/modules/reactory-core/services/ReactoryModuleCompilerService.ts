import fs from "fs";
import path from "path";
import { cwd } from "process";
import Reactory from "@reactory/reactory-core";
import { ENVIRONMENT } from "@reactory/server-core/types/constants";

const util = require("util");
const exec = util.promisify(require("child_process").exec);

/**
 * Service class that provides access to forms for the logged in user
 */

interface IRollupOptions {
  outputFile: string;
  inputFile: string;
  enviroment: string;
  moduleName: string;
}

const DefaultRollupOptions = (options: IRollupOptions) => `
/**
 * DO NOT EDIT THIS FILE, IT IS AUTO GENERATED AND WILL BE 
 * OVERWRITTEN EVERY TIME THE SOURCE PLUGIN FILE CHANGES
 **/
import { babel } from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from '@rollup/plugin-typescript';

const jsx = require('rollup-plugin-jsx');


const NODE_ENV = process.env.NODE_ENV || "development";

export default {
  input: "${options.inputFile}",
  output: {
    file: "${options.outputFile}",
    name: "${options.moduleName}",
    format: "umd",
    external: ['react', 'react-dom'],
    globals: ['React', 'window'],
    sourcemap: true
  },

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV || "development"),
      preventAssignment: true
    }),
    commonjs({
      include: 'node_modules/**',
      exclude: [
        'node_modules/process-es6/**',
      ],   
    }),
    typescript({
      sourceMap: true
    }),        
    babel({
      exclude: 'node_modules/**',
      include: ['./src/**/*.ts', './src/**/*.js', './src/**/*.tsx'],
      babelHelpers: "bundled",
      sourceMaps: "both",
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      presets: [
        [
          "@babel/preset-env",
          {
            modules: false,
          }
        ],

        [
          "@babel/preset-react",          
        ],

        [
          "@babel/preset-typescript",          
        ]
      ],          
    }),
    jsx({ factory: 'React.createElement' }),
    resolve(),
  ],
};
`;

class ReactoryModuleCompilerService
  implements Reactory.Service.IReactoryModuleCompilerService
{
  name: string = "ReactoryModuleCompilerService";
  nameSpace: string = "core";
  version: string = "1.0.0";

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;

  fileService: Reactory.Service.IReactoryFileService;

  constructor(
    props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.props = props;
    this.context = context;
  }

  /**
   * These should only be called during development, and should not be used in production.
   * Compiled resources should be stored in a CDN and served from there.
   * @param module
   * @returns
   */
  async compileModule(
    module: Reactory.Forms.IReactoryFormModule
  ): Promise<Reactory.Forms.IReactoryFormResource> {
    const that = this;

    const sourceFile: string = path.join(
      process.env.APP_DATA_ROOT,
      "plugins",
      "__runtime__",
      `src/source_${module.id}.${module.fileType}`
    );
    const compiledFile: string = path.join(
      process.env.APP_DATA_ROOT,
      "plugins",
      "__runtime__",
      `lib/${module.id}.min.js`
    );
    const newSource: string = path.join(
      process.env.APP_DATA_ROOT,
      "plugins",
      "__runtime__",
      `src/tmp_${module.id}.${module.fileType}`
    );
    let doCompile: boolean = false;
    let checksum: string = "";

    const { NODE_ENV } = ENVIRONMENT;
    const isDevelopment = NODE_ENV === "development";
    
    fs.writeFileSync(newSource, module.src);

    if (
      fs.existsSync(sourceFile) === false ||
      fs.existsSync(compiledFile) === false
    ) {
      doCompile = true;
    } else {
      checksum = await this.fileService
        .generateFileChecksum(sourceFile, "sha1")
        .then();
      let newChecksum = await this.fileService
        .generateFileChecksum(newSource, "sha1")
        .then();
      if (newChecksum !== checksum) {
        doCompile = true;
        checksum = newChecksum;
      }
    }

    const compileWithRollup = async (): Promise<{
      success: boolean;
      messages: string[];
    }> => {
      const results: any = {
        messages: [],
        success: false,
      };

      fs.writeFileSync(sourceFile, module.src);
      // create a bundle
      const $config = DefaultRollupOptions({
        enviroment: process.env.NODE_ENV || "development",
        inputFile: sourceFile,
        outputFile: compiledFile,
        moduleName: `reactory-plugin-${module.id
          .replace(".", "-")
          .replace("@", "-")}`,
      });

      const rollupConfigFile: string = path.join(
        process.env.APP_DATA_ROOT,
        "plugins",
        "__runtime__",
        `rollup.${module.id}.js`
      );
      fs.writeFileSync(rollupConfigFile, $config);
      try {
        const { stdout, stderr, error } = await exec(
          `npx rollup --config rollup.${module.id}.js`,
          {
            cwd: path.join(
              process.env.APP_DATA_ROOT,
              "plugins",
              "__runtime__"
            ),
            encoding: "utf8",
          }
        );
        that.context.log(
          `Compiled resource ${module.id}`,
          { stdout, stderr, error },
          "debug",
          ReactoryModuleCompilerService.reactory.id
        ); // This prints all deferred warnings
        if (fs.existsSync(compiledFile) === true) {
          results.success = true;
        }
      } catch (err) {
        that.context.log("Error executing shell command", { err }, "error");
      }
      return results;
    };

    if (doCompile === true) {
      const result = await compileWithRollup().then();
      if (result.success === false) {
        let notifications = [];
        notifications.push(
          `$reactory.createNotification("Compilation error on module ${module.id}, see console log for details", { type: 'warning' });`
        );
        let compilerErrors: string[] = [];
        result.messages.forEach((message) => {
          // `$reactory.log("${message}", { compilationError: true }, "error");`
          that.context.log("Error compiling module", { message }, "error");
          compilerErrors.push(message);
        });

        let failureScript = ` 
        if(window && window.reactory) {
          var $reactory = window.reactory.api;
          ${notifications.map((n) => `${n};\n`)}
          ${compilerErrors.map(
            (compilerResult) =>
              `$reactory.log("Compilation Failure for ${
                module.id
              } --> [${compilerResult}]", { module: ${JSON.stringify(
                module
              )} }, 'error');\n`
          )}            
        }
      `;
        fs.writeFileSync(compiledFile, failureScript);
      }
    }
    
    /**
     * The module compiler MUST return a valid compiled resource
     */
    const resource: Reactory.Forms.IReactoryFormResource = {
      name: module.id,
      type: "script",
      uri: `${process.env.CDN_ROOT}plugins/__runtime__/lib/${module.id}.min.js?cs=${checksum}`,
      id: module.id,
      signature: checksum,
      signatureMethod: "sha1",
      crossOrigin: false,
      signed: true,
      expr: "",
      required: true,
      cacheProvider: "CDN",
    };

    //always remove the temp file
    fs.unlinkSync(newSource);

    return resource;
  }

  async onStartup(): Promise<any> {
    const runtimePath = path.join(
      process.env.APP_DATA_ROOT,
      "plugins",
      "__runtime__"
    );
    const libPath = path.join(
      process.env.APP_DATA_ROOT,
      "plugins",
      "__runtime__",
      "lib"
    );
    const srcPath = path.join(
      process.env.APP_DATA_ROOT,
      "plugins",
      "__runtime__",
      "src"
    );

    if (!fs.existsSync(runtimePath)) {
      fs.mkdirSync(runtimePath, { recursive: true });
      const files = [
        ".jshintrc",
        ".nvmrc",
        "tsconfig.template.json",
        "package.template.json",
      ];
      this.context.log(
        "Copying runtime files",
        { files },
        "debug",
        ReactoryModuleCompilerService.reactory.id
      );
      const assetsFolder = path.join(
        cwd(),
        `${process.env.APPLICATION_ROOT}/modules/reactory-core/services/assets/RuntimePluginsProject`
      );
      files.forEach((file) => {
        fs.copyFileSync(
          path.join(assetsFolder, file),
          path.join(runtimePath, file)
        );
      });

      try {
        // rename the package.json and tsconfig.json
        fs.renameSync(
          path.join(runtimePath, "package.template.json"),
          path.join(runtimePath, "package.json")
        );
        fs.renameSync(
          path.join(runtimePath, "tsconfig.template.json"),
          path.join(runtimePath, "tsconfig.json")
        );
      } catch (renameException) {
        this.context.log(
          "Error renaming files",
          { renameException },
          "error",
          ReactoryModuleCompilerService.reactory.id
        );
      }

      //run npm install in the runtime folder
      this.context.log(
        "Running NPM Install - this may take ~3 - 5 minutes depending on your connection",
        { runtimePath },
        "debug",
        ReactoryModuleCompilerService.reactory.id
      );
      const { stdout, stderr } = await exec("npm install", {
        cwd: runtimePath,
      });

      if (stdout.length > 0)
        this.context.log(
          `NPM Install stdout`,
          { stdout },
          "debug",
          ReactoryModuleCompilerService.reactory.id
        );
      if (stderr.length > 0)
        this.context.log(
          `NPM Install stderr`,
          { stderr },
          "debug",
          ReactoryModuleCompilerService.reactory.id
        );
    }
    if (!fs.existsSync(libPath)) fs.mkdirSync(libPath, { recursive: true });
    if (!fs.existsSync(srcPath)) fs.mkdirSync(srcPath, { recursive: true });

    return true;
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

  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactoryModuleCompilerService> =
    {
      id: "core.ReactoryModuleCompilerService@1.0.0",
      nameSpace: "core",
      description: "Reactory Module Compiler Service",
      name: "ReactoryModuleCompilerService",
      service: (props, context) => {
        return new ReactoryModuleCompilerService(props, context);
      },
      dependencies: [
        {
          id: "core.ReactoryFileService@1.0.0",
          alias: "fileService",
        },
      ],
    };
}

export default ReactoryModuleCompilerService;
