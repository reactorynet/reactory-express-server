import Admin from '../../../application/admin';
export default {
  Survey: {

  },
  Query: {
    surveysForOrganization(obj, { organizationId }) {
      return Admin.Survey.getSurveysForOrganization(organizationId);
    },
  },
  Mutation: {

  },
};
