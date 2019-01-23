// model schema
export default {
  title: 'Survey Configuration',
  description: 'Use the form below to configure your Survey',
  type: 'object',
  required: ['organization', 'leadershipBrand', 'title', 'surveyType', 'startDate', 'endDate', 'mode', 'status'],
  properties: {
    id: {
      type: 'string',
      title: 'Id',
    },
    organization: {
      type: 'string',
      title: 'Organization',
    },
    leadershipBrand: {
      type: 'string',
      title: 'Leadership Brand',
    },
    title: {
      type: 'string',
      title: 'Survey Title',
      description: 'Provide a meaningful description for this survey',
    },
    surveyType: {
      type: 'string',
      title: 'Assessment Type',
    },
    startDate: {
      type: 'string',
      title: 'Start Date',
    },
    endDate: {
      type: 'string',
      title: 'End Date',
    },
    mode: {
      type: 'string',
      title: 'Survey Mode',
    },
    status: {
      type: 'string',
      title: 'Status',
    },
  },
};

export const defaultFormValue = {
  id: '',
};

export const createMutation = `
  mutation CreateSurveyMutation($id: String!, $surveyData: SurveyInput!){
    createSurvey(id: $id, surveyData: $surveyData){
      id
  } 
}`;

export const createMutationMap = {
  'formData.organization': ['id', 'surveyData.organization'],
  'formData.leadershipBrand': 'surveyData.leadershipBrand',
  'formData.surveyType': 'surveyData.surveyType',
  'formData.title': 'surveyData.title',
  'formData.startDate': 'surveyData.startDate',
  'formData.endDate': 'surveyData.endDate',
  'formData.mode': 'surveyData.mode',
  'formData.status': 'surveyData.status',
};

export const createMutationResultMap = {
  'createResult.id': 'surveyId',
  'formData.organization': 'organizationId',
};

export const surveyQuery = `
query SurveyDetail($surveyId: String!){
  surveyDetail(surveyId: $surveyId){
    id    
    leadershipBrand {
      id
      title
      description
      scale {
        id
        title
        entries {
          rating
          description
        }
      }
      qualities {
        id
        title
        behaviours {            
          ordinal
          description
        }
      }
    }
    organization {
      id
      name
      logo
    }
    status
    surveyType
    title
    startDate
    endDate
    mode    
  }
}
`;

export const queryMap = {
  'formContext.surveyId': 'surveyId',
};

export const queryResultMap = {
  id: 'id',
  title: 'title',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  mode: 'mode',
  surveyType: 'surveyType',
  'leadershipBrand.id': 'leadershipBrand',
  'organization.id': 'organization',
};

export const surveyDelegatesQuery = `
query SurveyDetail($surveyId: String!){
  surveyDetail(surveyId: $surveyId){
    id
    delegates {
      delegate {
        id
        firstName
        lastName
        email
        avatar
      }
      assessments {
        assessor {
          id
          firstName
          lastName
          email
          avatar
        }
        complete,
        selfAssessment
      }
      complete
      launched
      removed
    }
  }
}
`;

export const delegatesSchema = {
  type: 'array',
  title: 'Delegates',
  description: 'Contains a list of the delegates currently in the survey',
  items: {
    type: 'object',
    properties: {
      delegate: {
        type: 'object',
        title: '${formData.firstName}', //eslint-disable-line
        description: 'Delegate Information for ${formData.firstName} ${formData.lastName}', //eslint-disable-line
        properties: {
          id: { type: 'string', title: 'First name' },
          firstName: { type: 'string', title: 'First name' },
          lastName: { type: 'string', title: 'Last name' },
          email: { type: 'string', title: 'Email' },
        },
      },
      assessments: {
        type: 'array',
        title: 'Assessments for ${formContext.formData.delegate.firstName} ${formContext.formData.delegate.lastName}', //eslint-disable-line
        description: 'Assessment Status',
        properties: {
          assessor: {
            type: 'object',
            properties: {
              id: { type: 'string', title: 'Id' },
              firstName: { type: 'string', title: 'First name' },
              lastName: { type: 'string', title: 'Last name' },
              email: { type: 'string', title: 'Email' },
            },
          },
          complete: {
            type: 'boolean',
            title: 'Assessment Complete',
            readOnly: true,
          },
          selfAssessment: {
            type: 'boolean',
            title: 'Self Assessment',
            readOnly: true,
          },
        },
      },
    },
  },
};

export const updateMutation = `
  mutation UpdateSurveyMutation($id: String!, $surveyData: SurveyInput!){
    updateSurvey(id: $id, surveyData: $surveyData){
      id      
    }
  }`;

export const updateMutationMap = {
  'formData.id': 'id',
  'formData.organization': 'surveyData.organization',
  'formData.leadershipBrand': 'surveyData.leadershipBrand',
  'formData.surveyType': 'surveyData.surveyType',
  'formData.title': 'surveyData.title',
  'formData.startDate': 'surveyData.startDate',
  'formData.endDate': 'surveyData.endDate',
  'formData.mode': 'surveyData.mode',
  'formData.status': 'surveyData.status',
};

export const uiSchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      organization: { md: 6 },
      leadershipBrand: { md: 6 },
    },
    {
      surveyType: { md: 6 },
      title: { md: 6 },
    },
    {
      startDate: { md: 6 },
      endDate: { md: 6 },
    },
    {
      mode: { md: 3 },
      status: { md: 3 },
    },
  ],
  id: {
    'ui:widget': 'HiddenWidget',
    'ui:emptyValue': '',
  },
  organization: {
    'ui:widget': 'CompanyLogoWidget',
    'ui:options': {
      style: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '8px',
        marginBottom: '8px',
      },
    },
  },
  startDate: {
    'ui:widget': 'DateSelectorWidget',
  },
  endDate: {
    'ui:widget': 'DateSelectorWidget',
  },
  surveyType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: '180', value: '180', label: '180 Team Assessment' },
        { key: '360', value: '360', label: '360 Personal Assessment' },
      ],
    },
  },
  mode: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'live', value: 'live', label: 'Live' },
        { key: 'test', value: 'test', label: 'Test' },
      ],
    },
  },
  status: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'new', value: 'new', label: 'New' },
        { key: 'ready', value: 'ready', label: 'Ready For Launch' },
        { key: 'launched', value: 'launched', label: 'Launched' },
        { key: 'paused', value: 'paused', label: 'Paused' },
        { key: 'complete', value: 'complete', label: 'Complete' },
      ],
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
        'formContext.organizationId': 'organizationId',
      },
      resultItem: 'brandListForOrganization',
      resultsMap: {
        'brandListForOrganization.[].id': ['[].key', '[].value'],
        'brandListForOrganization.[].title': '[].label',
      },
    },
  },
};
