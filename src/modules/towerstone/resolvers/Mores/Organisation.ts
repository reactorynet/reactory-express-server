import { Reactory } from '@reactory/server-core/types/reactory'; // eslint-disable-line
import { Organization } from '@reactory/server-core/models'; // eslint-disable-line
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone'; // eslint-disable-line


export default {
  Query: {
    MyOrganisationMemberships: async (parent: any, params: any,
      context: Reactory.IReactoryContext): Promise<Reactory.IOrganization[]> => {

      const { user, partner } = context;
      const sortBy = 'name';

      if (user.hasAnyRole(partner._id) === false) return [];

      if (user.hasRole(partner._id, 'ADMIN') === true || user.hasRole(partner._id, 'DEVELOPER')) {
        return Organization.find({}).sort(sortBy).then();
      }
      const _membershipOrganizationIds: any[] = [];
      context.user.memberships.forEach((membership) => {
        if (membership.organizationId &&
          membership.clientId === partner._id &&
          _membershipOrganizationIds.indexOf(membership.organizationId) < 0) {
          _membershipOrganizationIds.push(membership.organizationId);
        }
      });

      // collect all my membership organizations
      return Organization.find({ _id: { $in: _membershipOrganizationIds } }).sort(sortBy).then();
    },
  },
  Mutation: {
    MoresUploadOrganizationImage: async (parent: any, params: { id: string, file: Reactory.Service.IFile, imageType: string }, context: Reactory.IReactoryContext) => {
      const organizationSvc: Reactory.Service.IReactoryOrganizationService = context.getService('core.OrganizationService@1.0.0');

      return organizationSvc.uploadOrganizationImage(params.id, params.file, params.imageType);
    },
    MoresSetOrganizationInfo: async (parent: any, params: TowerStone.IMoresSetOrganizationParams, context: Reactory.IReactoryContext): Promise<any> => {

      const organizationSvc: Reactory.Service.IReactoryOrganizationService = context.getService('core.OrganizationService@1.0.0');

      return organizationSvc.setOrganization(params.id, params.updates);
    }
  }
};
