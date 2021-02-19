import { Reactory } from '@reactory/server-core/types/reactory'; // eslint-disable-line
import { Organization } from '@reactory/server-core/models'; // eslint-disable-line


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
};
