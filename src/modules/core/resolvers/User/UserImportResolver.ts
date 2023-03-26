/* eslint-disable camelcase */
import { filter, findIndex } from 'lodash';
import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';
import ReactoryFile from '@reactory/server-modules/core/models/CoreFile';
import Organization from '@reactory/server-core/models/schema/Organization';
import ReactoryFileImportPackage from '@reactory/server-modules/core/models/ReactoryFileImportPackage';
import ApiError, { InsufficientPermissions, OrganizationNotFoundError } from '@reactory/server-core/exceptions';
import { ObjectId } from 'bson';
import mongoose from 'mongoose';


interface UserFileImportStatusParams {
  organization_id: string,
  workload_id: string,
}


const graph: any = {
  ImportFile: {
    id: (importFile: any) => importFile._id ? importFile._id.toString() : null,
    file: (importFile: any) => importFile._id ? ReactoryFile.findById(importFile._id) : null,
  },
  ReactoryFileImportPackage: {
    /**
     * id for the import package
     * @param obj 
     * @returns 
     */
    id: (obj: Reactory.IReactoryFileImportPackageDocument) => {
      if (obj._id) return obj._id.toString();
      return null;
    },
    // eslint-disable-next-line max-len
    organization: async (parent: Reactory.IReactoryFileImportPackage): Promise<Reactory.IOrganization> => {
      const { organization } = parent;

      if (typeof organization === 'object') {
        if (organization._id && organization.name) {
          return organization;
        }

        if (ObjectId.isValid(organization) === true) {
          return Organization.findById(organization).then();
        }
      }

      if (typeof organization === 'string') {
        if (ObjectId.isValid(organization) === true) {
          return Organization.findById(organization).then();
        }
      }

      return null;
    },

    files: async (parent: Reactory.IReactoryFileImportPackage, params: any) => {
      if (params.file_ids) {
        let _files: any[] = [];

        params.file_ids.forEach((file_id: string) => {
          let index = findIndex(parent.files, (e: any) => {
            if (e._id) return e._id.toString() === file_id
            if (e && e.toString) return e.toString() === file_id
          });

          if (index >= 0) {
            _files.push(parent.files[index])
          }
        });

        return _files;
      }

      if (parent && parent.files) return parent.files;

      return [];
    }
  },
  Query: {
    // eslint-disable-next-line max-lens
    ReactoryFileImportPackage: async (parent: any, params: UserFileImportStatusParams, context: Reactory.Server.IReactoryContext): Promise<Reactory.IReactoryFileImportPackage> => {
      const { user, partner } = context;
      let response: any = null;
      const { organization_id, workload_id } = params;

      const organization = await Organization.findById(organization_id).then();

      if (!organization) throw new OrganizationNotFoundError('Could not find an organization matching the id', organization_id);
      let granted = user.hasRole(`${partner._id}`, 'ADMIN') || user.hasRole(`${partner._id}`, 'DEVELOPER');

      if (granted === false) granted = user.hasRole(`${partner._id}`, 'ORGANIZATION_ADMIN', organization_id);

      if (granted === true) {
        if (workload_id !== null && workload_id !== undefined && workload_id.length > 0) {
          response = await ReactoryFileImportPackage.findById(workload_id).then();
        }

        if (!response) {
          // check if there is an existing draft import
          response = await ReactoryFileImportPackage.findOne({
            owner: user._id,
            organization: organization._id,
            status: 'new',
          }).then();


          if (!response) {
            response = new ReactoryFileImportPackage({
              organization,
              owner: user._id,
              status: 'new',
              files: [],
              processors: [
                {
                  name: 'CSV2JSON',
                  serviceFqn: 'core.UserFileImportCSV2JSON@1.0.0',
                  order: 0,
                  fields: ['firstName'],
                  started: null,
                  finished: null,
                  responses: [],
                  status: 'pending',
                },
                {
                  name: 'File Preview',
                  serviceFqn: 'core.UserFileImportPreview@1.0.0',
                  order: 0,
                  fields: ['firstName'],
                  started: null,
                  finished: null,
                  responses: [],
                  status: 'pending',
                },
                {
                  name: 'File Validation',
                  serviceFqn: 'core.UserFileImportValidation@1.0.0',
                  order: 1,
                  started: null,
                  finished: null,
                  responses: [],
                  status: 'pending',
                },
                {
                  name: 'User General Import',
                  serviceFqn: 'core.UserFileImportProcessGeneral@1.0.0',
                  order: 2,
                  started: null,
                  finished: null,
                  responses: [],
                  status: 'pending',
                },
                {
                  name: 'User Demographics Import',
                  serviceFqn: 'core.UserFileImportProcessDemographics@1.0.0',
                  order: 3,
                  started: null,
                  finished: null,
                  responses: [],
                  status: 'pending',
                },
              ],
              options: { delimeter: ',', textQualifier: null, firstRow: 'header', columnMappings: [] },
            });

            response.save();
          }
        }

        return response;
      }

      throw new InsufficientPermissions('You do not have the permissions to import users for this organization');
    },
  },
  Mutation: {
    SetReactoryFileImportPackageStatus: async (parent: any, params: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.IReactoryFileImportPackage> => {
      const { workload_id, status } = params;
      const { user, partner } = context;
      if (user.hasRole(partner.id, 'ADMIN') || user.hasRole(partner.id, 'DEVELOPER')) {
        const instance: any = await ReactoryFileImportPackage.findById(workload_id).then();
        instance.status = status;
        instance.save();

        return instance;
      }

      throw new InsufficientPermissions('You do not have the permissions to import users for this organization');
    },
    DeleteUserFileUpload: async (): Promise<any> => {
      throw new ApiError('Not Implemented Yet');
    },
    /**
     * Call this resolver to add a file to an import package. Returns a FileImport item
     * @param parent
     * @param params 
     * @param context 
     */
    AddFileToImportPackage: async (parent: any, params: { file: any, workload_id: string }, context: Reactory.Server.IReactoryContext) => {
      try {
        debugger
        const { workload_id, file } = params;
        const fileService: Reactory.Service.IReactoryFileService = context.getService('core.ReactoryFileService@1.0.0') as Reactory.Service.IReactoryFileService;
        //upload the file and associate with the workload package
        logger.debug(`Uploading File using Reactory File Service`, { filename: params.file.filename });

        let fileModel = await fileService.uploadFile({
          file,
          filename: file.filename,
          uploadContext: `reactory_file_import_package::${params.workload_id}`,
          isUserSpecific: true,
          rename: false,
          catalog: true,
        }).then();

        debugger
        try {
          // get the package manager server.
          const packman: Reactory.IReactoryImportPackageManager = context.getService('core.ReactoryFileImportPackageManager@1.0.0') as Reactory.IReactoryImportPackageManager
          const import_file = await packman.addFile(workload_id, fileModel);
          return import_file
        } catch (packmanError) {
          logger.error(`Error with packman service ${packmanError.message}`, packmanError);
          throw new ApiError(`Error with packman service ${packmanError.message}`, { original: packmanError });
        }
      } catch (addDocumentError) {
        throw addDocumentError;
      }

    },
    RemoveFileFromImportPackage: async (parent: any, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.CoreSimpleResponse> => {
      
      type t_arg = {file_id: string, workload_id: string }
      
      const { 
        file_id,
        workload_id
      }: t_arg = args;
      
      try {
        debugger
        const packman: Reactory.IReactoryImportPackageManager = context.getService('core.ReactoryFileImportPackageManager@1.0.0') as Reactory.IReactoryImportPackageManager
        const start_result = await packman.removeFile(workload_id, file_id);
        return start_result;
      } catch (packmanError) {
        logger.error(`Error with packman service ${packmanError.message}`, packmanError);
        throw new ApiError(`Error with packman service ${packmanError.message}`, { original: packmanError });
      }
    },
    StartImportPackage: async (obj: any, args: { workload_id: string }, context: Reactory.Server.IReactoryContext): Promise<any> => {
      throw new ApiError('Not Implemented Yet');
    },
    StopImportPackage: async (obj: any, args: { workload_id: string }, context: Reactory.Server.IReactoryContext): Promise<any> => {
      throw new ApiError('Not Implemented Yet');
    },
    StartProcessForPackage: async (
      obj: any,
      args: { workload_id: string, processors: string[], file_ids: string[] },
      context: Reactory.Server.IReactoryContext): Promise<any> => {

      try {
        const packman: Reactory.IReactoryImportPackageManager = context.getService('core.ReactoryFileImportPackageManager@1.0.0') as Reactory.IReactoryImportPackageManager
        const start_result = await packman.start(args.workload_id, args.file_ids, args.processors);
        return start_result;
      } catch (packmanError) {
        logger.error(`Error with packman service ${packmanError.message}`, packmanError);
        throw new ApiError(`Error with packman service ${packmanError.message}`, { original: packmanError });
      }

    },
    /**
     * Generates a preview of the import file
     * @param parent 
     * @param params 
     * @param context 
     * @returns 
     */
    PreviewImportFile: async (parent: any, params: { workload_id: string, file_id: string, processors: string[] }, context: Reactory.Server.IReactoryContext): Promise<Reactory.CoreSimpleResponse> => {

      try {
        const packman: Reactory.IReactoryImportPackageManager = context.getService('core.ReactoryFileImportPackageManager@1.0.0') as Reactory.IReactoryImportPackageManager
        const payload = packman.previewFile(params.workload_id, params.file_id, params.processors);

        return {
          message: 'Preview generation complete',
          success: true,
          payload
        }
      } catch (err) {
        return {
          message: 'Preview generation failed',
          success: false,
          payload: {
            error: err.message
          }
        }
      }

    }
  },
};

export default graph;
