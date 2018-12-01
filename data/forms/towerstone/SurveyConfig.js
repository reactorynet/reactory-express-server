//model schema
export default {
  title: 'Survey Configuration',
  type: 'object',
  required: ['organization', 'leadershipBrand', 'title', 'surveyType', 'startDate', 'endDate', 'mode', 'status'],
  properties: {
    organization: {
      type: 'string',
      title: 'Organization',      
    },
    surveyTitle: {
      type: 'string',
      title: 'Survey Title',
      description: 'Provide a meaningful description for this survey'
    },
    surveyHeader: {
      type: 'string',
      title: 'Survey Header',
      desription: 'Provider a header message for deleagates and their assessors when they perform complete the assessments.'
    },
    assessmentType: {
      type: 'string',
      title: 'Assessment Type',
    },
    leadershipBrand: {
      type: 'string',
      title: 'Leadership Brand',    
    },
    mode: {
      type: 'string',
      title: 'Survey Mode',
    },
  },
};

export const uiSchema = {
  organization: {
    'ui:widget': 'OrganizationLogoWidget',
    'ui:options': {
      readOnly: true,
    },
  },
  leadershipBrand: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      query: `query BrandListForOrganization($organizationId: String!){
        brandListForOrganization(organizationId: $organizationId){
          id,
          title
        }
      }`,
      propertyMap: {
        organizationId: 'formData.organization',
      },
      resultsMap: {
        '[].id': 'key',
        '[].title': 'title',
      },
    },
  },
};
