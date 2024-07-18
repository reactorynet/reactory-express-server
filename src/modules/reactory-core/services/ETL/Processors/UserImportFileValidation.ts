'use strict';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Reactory from '@reactory/reactory-core';


class UserFileImportValidation implements Reactory.Service.IProcessor {

  context: Reactory.Server.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  _fileService: Reactory.Service.IReactoryFileService = null;
  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this._fileService = fileService;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any): Promise<any> {

    debugger;

    return new Promise((resolve, reject) => {
      const { offset = 0, file, import_package, process_index, next } = params;

      //1. get the file handle
      file.file.lineCount((result: any) => {

        //2. read file line by line and process general information

        async function processLineByLine() {
          const fileStream = fs.createReadStream(path.join());

          const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
          });
          // Note: we use the crlfDelay option to recognize all instances of CR LF
          // ('\r\n') in input.txt as a single line break.

          //@ts-ignore
          for await (const line of rl) {
            // Each line in input.txt will be successively available here as `line`.
            console.log(`Line from file: ${line}`);
          }
        }

        processLineByLine();

      });


      //3. update processor state and hand off to next processor


      if (next) {
        let $next = process_index + 1 >= file.processors.length ? null : file.processors[process_index + 1];
        next({ ...params, process_index: process_index + 1, next });
      }

      resolve(true);
    })
  }


  static reactory = {
    id: 'core.UserFileImportValidation@1.0.0',
    nameSpace: 'core',
    name: 'UserFileImportValidation',
    version: '1.0.0',
    description: 'Reactory Service for valdating an import file for users',
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }
    ],
    serviceType: 'data',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new UserFileImportValidation(props, context);
    }
  }
}

export default UserFileImportValidation;