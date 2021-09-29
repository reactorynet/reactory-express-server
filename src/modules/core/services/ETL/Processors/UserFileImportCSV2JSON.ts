'use strict';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

import { Reactory } from '@reactory/server-core/types/reactory';
import ApiError from 'exceptions';

const DefaultOptions = {
  delimiter: ",",
  firstRowIsHeader: true,
}

class UserFileImportCSV2JSON implements Reactory.IProcessor {

  context: Reactory.IReactoryContext;

  name: string = "UserFileImportCSV2JSON";
  nameSpace: string = "core";
  version: string = "1.0.0";

  props: any;

  fileService: Reactory.Service.IReactoryFileService;
  packageManager: Reactory.IReactoryImportPackageManager;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
    this.fileService = props.$dependencies.fileService;
    this.packageManager = props.packman;
  }

  async process(params: Reactory.IProcessorParams, nextProcessor?: Reactory.IProcessor): Promise<any> {
    const that = this;
    that.context.log(`Method call UserFileImportCSV2JSON.process(params, nextProcessor?)`);
    let output: any[] = [];

    const {
      file,
      import_package,
      process_index = 0,
      processors = [],
      preview = false,
      options = DefaultOptions,
      next
    } = params;

    //read the file and convert the lines to json

    const lineCount = await file.file.lineCount();

    //2. read file line by line and process general information    
    async function processLineByLine() {

      const fileStream = fs.createReadStream(file.file.getServerFilename());

      try {
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });
        // Note: we use the crlfDelay option to recognize all instances of CR LF
        // ('\r\n') in input.txt as a single line break.

        let lindex = 0;
        //@ts-ignore
        for await (const line of rl) {
          // Each line in input.txt will be successively available here as `line`.
          that.context.log(`${lindex}/${lineCount} -> ${line}`);
          let columns = line.split(options.delimiter || ",");
          // if (options.firstRowIsHeader === true && lindex === 0) output.push(columns);
          if (lindex > 0) output.push(columns);

          lindex = lindex + 1;
        }
      } catch (e) {
        that.context.log('Error while processing file data', { error: e }, 'error', 'UserFileImportCSV2JSON');
        throw new ApiError('Error Processing File', { error: e });
      }
      
    }


    await processLineByLine();

    let $next: Reactory.IProcessor = this.packageManager.getNextProcessor();

    // if (nextProcessor && nextProcessor.process) {
    //   $next = nextProcessor;
    // }

    // if ($next === null && next && next.serviceFqn) {
    //   $next = this.context.getService(next.serviceFqn);
    // }

    // if ($next === null && processors.length > process_index + 1) {
    //   $next = this.context.getService(processors[process_index + 1].serviceFqn);
    // }

    if ($next !== null && $next.process) {
      output = await $next.process({ 
        input: output, 
        file, 
        import_package, 
        processors,
        next: processors.length >= process_index + 2 ? processors[process_index + 2] : null,
        process_index: process_index + 1 }).then();
    }

    return output;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  static dependencies: [{ id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }];

  static reactory = {
    id: 'core.UserFileImportCSV2JSON@1.0.0',
    name: 'ReactoryUserFileCSV2JSONProcessor',
    description: 'Reactory Service for converting a csv file with user data to a json structure',
    dependencies: UserFileImportCSV2JSON.dependencies,
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserFileImportCSV2JSON(props, context);
    }
  };


}

export default UserFileImportCSV2JSON;