import fs from 'fs';
import path from 'path';
import { Reactory } from "@reactory/server-core/types/reactory";
import { filter, findIndex, sortBy } from 'lodash';
import ReactoryFile, { ReactoryFileModel } from "@reactory/server-modules/core/models/CoreFile";
import ReactoryFileImportPackage from '@reactory/server-modules/core/models/ReactoryFileImportPackage';
import logger from "@reactory/server-core/logging";
import { ObjectId } from "mongodb";
import ApiError from "exceptions";

/**
 * Simple service class that reads in a file from a row offset and
 * uses the file options to generate data preview.
 */

const filterFiles = (file_ids: string[], files: any[]) => {
  if (file_ids) {
    let _files: any[] = [];

    file_ids.forEach((file_id: string) => {
      let index = findIndex(files, (e: any) => {
        if (e._id) return e._id.toString() === file_id
        if (e && e.toString) return e.toString() === file_id
      });

      if (index >= 0) {
        _files.push(files[index])
      }
    });

    return _files;
  }
}

const filterProcessors = (processor_ids: string[], processors: any[]) => {
  let _processors: any[] = [];
  if (processor_ids) {
    processor_ids.forEach((processor_id: string) => {
      let index = findIndex(processors, (e: any) => {
        if (e.serviceFqn) return e.serviceFqn === processor_id;
        return false;
      });

      if (index >= 0) {
        _processors.push(processors[index])
      }
    });



    return _processors.sort((a, b) => {
      if (a.order > b.order) return 1;
      if (a.order < b.order) return -1;

      return 0
    });
  }
}

class UserImportFilePreview {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any): Promise<any> {
    const { offset = 0, file } = params;
    this.context.user.hasAnyRole(this.context.partner._id);
    return 'done';
  }
}

class UserFileImportValidation {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any): Promise<any> {
    const { offset = 0, file } = params;
    this.context.user.hasAnyRole(this.context.partner._id);
    return 'done';
  }
}

class UserFileImportProcessGeneral {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any): Promise<any> {

    return new Promise((resolve, reject) => {
      const { offset = 0, file, import_package, process_index, next } = params;

      //1. get the file handle
      file.file.lineCount((result) => {

        //2. read file line by line and process general information

        async function processLineByLine() {
          const fileStream = fs.createReadStream(path.join());

          const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
          });
          // Note: we use the crlfDelay option to recognize all instances of CR LF
          // ('\r\n') in input.txt as a single line break.

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
}

class UserFileImportProcessDemographics {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any): Promise<any> {

    const { offset = 0, file } = params;
    this.context.user.hasAnyRole(this.context.partner._id);
    return 'done';
  }
}




class ReactoryFileImportPackageManager implements Reactory.IReactoryImportPackageManager {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  async start(workload_id: string, file_ids: string[] = [], processors: string[] = []): Promise<any> {


    // 1. load the workload item
    const pkg: Reactory.IReactoryFileImportPackageDocument = await ReactoryFileImportPackage.findById(workload_id).then();

    const { files } = pkg;
    // 2. check if there are files

    if (files && files.length === 0) {
      return {
        success: false,
        message: `No files available in this package: ${pkg._id}`
      }
    }

    let $files = files;
    if (file_ids.length > 0) {
      $files = filterFiles(file_ids, $files);
    }

    // 3. assign processors to the files 
    let $processors = pkg.processors;

    if (processors.length > 0) {
      $processors = filterProcessors(processors, $processors);
    }


    // 4. iterate through each file and execute
    let processor_promises: Promise<any>[] = [];
    $files.forEach((file_item: any) => {
      file_item.processors = $processors;
      // only invoke the first processors
      // the first one must call the next and so forth
      const procsvc = this.context.getService(file_item.processors[0].serviceFqn);
      if (procsvc && procsvc.process) {
        processor_promises.push(procsvc.process({
          file: file_item,
          import_package: pkg,
          process_index: 0,
          next: $processors.length > 1 ? $processors[1] : null
        }));
      }
    });


    if (processor_promises.length > 0) await Promise.all(processor_promises).then();
    // the processors in sequence
    // and set the status to 'running' if it
    // passes the validation for the processors.

    // 5. collate results
    return {
      success: true,
      message: `Started (${processor_promises.length}) processes for (${$files.length}) file(s) in package ${pkg._id}`
    }

  }

  stop(workload_id: string, file_ids: string[]): Promise<boolean> {
    // 1. Check if the workload is available and status is 'running'

    // 2. Set it to "stopped"

    return Promise.resolve(true);
  }

  delete(workload_id: string): Promise<boolean> {
    //1. load the workload 

    //2. delete the workload and remove files.

    return Promise.resolve(true);
  }

  async addFile(workload_id: string, file: Reactory.IReactoryFileModel): Promise<any> {
    let result: any;
    //1. validate basics, is it a CSV is there rows
    try {
      const stats = file.stats();
      if (stats.size <= 0) throw new ApiError('File does not contain data');

    } catch (statErr) {
      //cannot read the file, may be deleted.
      throw new ApiError('Could not check file size, make sure the file uploaded correctly.')
    }


    //2. add the file
    const pkg: Reactory.IReactoryFileImportPackageDocument = await ReactoryFileImportPackage.findById(workload_id).then();
    if (!pkg.files) pkg.files = [];

    let userFile: any = {
      _id: file._id,
      file: file._id,
      preview: [],
      options: pkg.options,
      status: 'added',
      //expand the processors on the parent object to the file.
      processors: [],
      rows: -1,
    };

    pkg.files.push(userFile);


    await pkg.save().then();
    //3. start the preview processor
    return userFile;
  }

  removeFile(workload_id: string, file_id: string): Promise<any> {
    let result: any;
    //1. Check item,

    //2. load up file

    //3. delete file
    return result;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }
}



export default [
  {
    id: 'core.UserFileImportPreview@1.0.0',
    name: 'Reactory User File Import Preview',
    description: 'Reactory Service for generating a user preview for importing.',
    dependencies: ['core.ReactoryFileService@1.0.0'],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserImportFilePreview(props, context);
    }
  },
  {
    id: 'core.UserFileImportValidation@1.0.0',
    name: 'Reactory User File Import Validation',
    description: 'Reactory Service for valdating an import file for users',
    dependencies: ['core.ReactoryFileService@1.0.0'],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserFileImportValidation(props, context);
    }
  },
  {
    id: 'core.UserFileImportProcessGeneral@1.0.0',
    name: 'Reactory User File Import General Information',
    description: 'Reactory Service for importing the general information.',
    dependencies: ['core.ReactoryFileService@1.0.0'],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserFileImportProcessGeneral(props, context);
    }
  },
  {
    id: 'core.UserFileImportProcessDemographics@1.0.0',
    name: 'Reactory User File Import Demographics',
    description: 'Reactory Service for importing demographics.',
    dependencies: ['core.ReactoryFileService@1.0.0'],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserFileImportProcessDemographics(props, context);
    }
  },
  {
    id: 'core.ReactoryFileImportPackageManager@1.0.0',
    name: 'Reactory File Import Package Manager',
    description: 'Import package manager that will manage the process of importing a file or a batch of files',
    dependencies: ['core.ReactoryFileService@1.0.0'],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new ReactoryFileImportPackageManager(props, context);
    }
  }
];