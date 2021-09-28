import fs from 'fs';
import path from 'path';
import { Reactory } from "@reactory/server-core/types/reactory";
import { filter, findIndex, sortBy } from 'lodash';
import ReactoryFile, { ReactoryFileModel } from "@reactory/server-modules/core/models/CoreFile";
import ReactoryFileImportPackage from '@reactory/server-modules/core/models/ReactoryFileImportPackage';
import ApiError from "@reactory/server-core/exceptions";
import { RecordNotFoundError } from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';




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


class ReactoryFileImportPackageManager implements Reactory.IReactoryImportPackageManager {

  context: Reactory.IReactoryContext;

  name: string = 'ReactoryFileImportPackageManager';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  props: any;

  fileService: Reactory.Service.IReactoryFileService;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  /**
   * Helper function to load a package by id
   * @param workload_id
   * @returns - a package if found
   * @throws - RecordNotFoundError when the record cannot be located.
   */
  async getPackage(workload_id: string): Promise<Reactory.IReactoryFileImportPackageDocument> {
    this.context.log(`Method call: getPackage(workload_id: string => ${workload_id}`, {}, 'debug', this.name);
    const pkg = await ReactoryFileImportPackage.findById(workload_id)
      .populate('files.file')
      .populate('organization').then()

    if (!pkg)
      throw new RecordNotFoundError(`Workload package with the id ${workload_id} does not exist.`, 'ReactoryFileImportPackage', { source: 'services.ETL.ImportServices.ReactoryFileImportPackageManager' });

    return pkg;
  }


  async processFile(workload_id: string, file_id: string, processors: string[], preview: boolean = false) {
    this.context.log(`Method call: porocessFile(workload_id: string => ${workload_id}`, {}, 'debug', this.name);
    const pkg: Reactory.IReactoryFileImportPackageDocument = await this.getPackage(workload_id);
    const $packman = this;
    const { files } = pkg;
    // 2. check if there are files

    if (files && files.length === 0) {
      return {
        success: false,
        //@ts-ignore
        message: `No files available in this package: ${pkg._id}`
      }
    }

    let $files = filterFiles([file_id], files);
    //we should only have one file match
    if ($files.length === 1) {
      // 3. assign processors to the files 
      let $processors = pkg.processors;

      if (processors.length > 0) {
        $processors = filterProcessors(processors, $processors);
      }

      let start_promise: Promise<any> = null;
      let $file: Reactory.IImportFile = $files[0];

      $file.processors = $processors;
      // only invoke the first processors
      // the first one must call the next and so forth
      const procsvc: Reactory.IProcessor = this.context.getService($file.processors[0].serviceFqn, { packman: $packman });

      let nextSvc: Reactory.IProcessor = null;
      let nextProcessorEntry: Reactory.IFileImportProcessorEntry = null;

      if ($processors.length >= 2) {
        nextProcessorEntry = $file.processors[1];
        nextSvc = this.context.getService(nextProcessorEntry.serviceFqn, { packman: $packman });
      }


      let results: any[] = [];

      try {
        this.context.log(`Staring IProcessor (${this.nameSpace}.${this.name})`, {}, 'debug', this.name);
        results = await procsvc.process({
          file: $file,
          import_package: pkg,
          process_index: 0,
          processors: $processors,
          preview: results,
          next: $processors.length > 1 ? $processors[1] : null
        }, nextSvc).then();

      } catch (err) {
        this.context.log('Error caught while processing file', { file: $file }, 'error');
        throw err;
      }


      return results
    }
  }

  /**
   * Generates the preview data for the specific file in a package.
   * @param workload_id 
   * @param file_id - the file id we want to use to generate the preview
   * @param processors - the list of processors to apply to creating a preview.
   * @returns 
   */
  async previewFile(workload_id: string, file_id: string, processors: string[]): Promise<any> {    
    return this.processFile(workload_id, file_id, processors, true);
  }

  async start(workload_id: string, file_ids: string[] = [], processors: string[] = []): Promise<any> {
    this.context.log(`Starting package id ${workload_id}`, { workload_id, file_ids, processors },'debug', 'ReactoryPackageManager')
    try {
      
      const results = await Promise.all(file_ids.map((file_id, index, $file_ids) => this.processFile(workload_id, file_id, processors, false))).then();

      return {
        success: true,
        message: `Processed files`,
        payload: results
      }
    } catch(exc) {
      const meta = { error: exc, args: { workload_id, file_ids, processors } };
      this.context.log(`An error occured while processing the file data`, meta, 'error');
      throw new ApiError(`Data Import Error`, meta);
    }
    
  }

  async stop(workload_id: string, file_ids: string[]): Promise<boolean> {
    // 1. Check if the workload is available and status is 'running'

    // 2. Set it to "stopped"

    return Promise.resolve(true);
  }

  async delete(workload_id: string): Promise<boolean> {
    //1. load the workload 

    //2. delete the workload and remove files.

    return Promise.resolve(true);
  }

  async addFile(workload_id: string, file: Reactory.IReactoryFileModel): Promise<any> {
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

    pkg.save();
    //3. start the preview processor
    return userFile;
  }

  async removeFile(workload_id: string, file_id: string): Promise<any> {
    //1. Check item,
    const pkg: Reactory.IReactoryFileImportPackageDocument = await this.getPackage(workload_id);    
    if (!pkg) throw new RecordNotFoundError(`Could not find the package with id: ${workload_id}`, 'ReactoryFileImportPackage', {});

    //2. load up file
    const { files } = pkg;
    if (files && files.length === 0) {
      return {
        success: false,
        message: `No files available in this package: ${pkg._id}`
      }
    }

    let $files = [];
    for(let x = 0; x < files.length; x++) {
      if(files[x]._id.equals(new ObjectId(file_id)) === false) {
        $files.push(files[x]);
      } else {
        const file = await this.fileService.getFileModel(file_id);
        if(file.exists() === true) {
          //file might not be on disk
          fs.unlinkSync(file.getServerFilename());          
        }

        if (!file.timeline) file.timeline = [];
        file.timeline.push({
          message: `${this.context.user.fullName(true)} deleted file from package and disk`,
          timestamp: Date.now().valueOf()
        });
        file.deleted = true;
        file.save();
      }
    }

    pkg.files = $files;
    pkg.save();
        
    return {
      success: true,
      message: 'File has been deleted'
    };
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  /**
   * 
   * @param fileService Setter for the file service
   */
  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }

  static reactory = {
    id: 'core.ReactoryFileImportPackageManager@1.0.0',
    name: 'Reactory File Import Package Manager',
    description: 'Import package manager that will manage the process of importing a file or a batch of files',
    dependencies: [{ id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new ReactoryFileImportPackageManager(props, context);
    }
  };
}


export default ReactoryFileImportPackageManager