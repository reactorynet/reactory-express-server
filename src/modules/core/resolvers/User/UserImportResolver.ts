/* eslint-disable camelcase */
import { Reactory } from '@reactory/server-core/types/reactory';
import ReactoryFile from '@reactory/server-modules/core/models/CoreFile';
import Organization from '@reactory/server-core/models/schema/Organization';
import UserImportFile from '@reactory/server-modules/core/models/UserImportFile';
import ApiError, { InsufficientPermissions, OrganizationNotFoundError } from '@reactory/server-core/exceptions';
import { ObjectId } from 'bson';
import mongoose from 'mongoose';


interface UserFileImportStatusParams {
  organization_id: string,
  workload_id: string,
}

const graph: any = {
  UserFileImport: {

  },
  Query: {
    UserFileImportStatus: async (parent: any, params: UserFileImportStatusParams, context: Reactory.IReactoryContext): Promise<Reactory.IUserImportFile> => {
      const { user, partner } = context;
      let response: any = null;
      const { organization_id, workload_id } = params;

      const organization = await Organization.findById(organization_id).then();

      if (!organization) throw new OrganizationNotFoundError('Could not find an organization matching the id', organization_id);

      if (user.hasRole(partner.id, 'ADMIN', organization_id) || user.hasRole(partner.id, 'DEVELOPER', organization_id)) {
        if (workload_id !== null && workload_id !== undefined && workload_id.length > 0) {
          response = await UserImportFile.findById(workload_id).then();
        }

        if (!response) {
          response = new UserImportFile({
            id: new ObjectId(),
            owner: user,
            status: 'draft',
            options: { delimeter: ',', textQualifier: null, firstRow: 'header' },
          });

          response.save();
        }

        return response;
      }

      throw new InsufficientPermissions('You do not have the permissions to import users for this organization');
    },
  },
  Mutation: {
    SetUserImportFileUpload: async (parent: any, params: any, context: Reactory.IReactoryContext): Promise<Reactory.IUserImportFile> => {
      const { workload_id, status } = params;
      const { user, partner } = context;
      if (user.hasRole(partner.id, 'ADMIN') || user.hasRole(partner.id, 'DEVELOPER')) {
        const instance: any = await UserImportFile.findById(workload_id).then();
        instance.status = status;
        instance.save();

        return instance;
      }

      throw new InsufficientPermissions('You do not have the permissions to import users for this organization');
    },
  },
};

export default graph;
