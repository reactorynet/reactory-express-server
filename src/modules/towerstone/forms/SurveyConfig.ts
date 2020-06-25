// model schema
import { defaultFormProps } from '../../../data/forms/defs';
import { FormNameSpace } from '../constants';

export const schema = {
  title: 'Survey Configuration',
  description: 'Use the form below to configure your Survey',
  type: 'object',
  required: [
    'organization', 
    'leadershipBrand', 
    'title', 
    'surveyType', 
    'startDate', 
    'endDate', 
    'mode', 
    'status'
  ],
  dependencies: {
    'surveyType': {
      oneOf: [
        {
          properties: {
            surveyType: {
              enum: ["180", 'team180']
            },
            delegateTeamName: {
              type: 'string',
              title: 'Delegate Team Name',
              defaultValue: 'Delegates'                            
            },
            assessorTeamName: {
              type: 'string',
              title: 'Assessor Team Name',                            
              defaultValue: 'Assessors'
            }
          }           
        },
        {
          properties: {
            surveyType: {
              enum: ["plc", "360"]
            }
          }           
        }
      ]    
    }
  },
  properties: {
    id: {
      type: 'string',
      title: 'Id',
      name: 'Id'
    },
    organization: {
      type: 'object',
      title: 'Organization',
      properties: {
        id: {
          type: 'string'
        },
        logo: {
          type: 'string'
        }
      }
    },
    leadershipBrand: {
      type: 'string',
      title: 'Leadership Brand',
      name: 'Leadership Brand'
    },
    title: {
      type: 'string',
      title: 'Survey Title',
      description: 'Provide a meaningful description for this survey',
    },    
    surveyType: {
      type: 'string',
      title: 'Assessment Type',
      enum: [
        'plc',
        '180',
        '360',
        'i360',
        'l360',
        'culture',
        'team180'
      ],
      default: '360',
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
  'formData.organization.id': ['id', 'surveyData.organization'],
  'formData.leadershipBrand': 'surveyData.leadershipBrand',
  'formData.surveyType': 'surveyData.surveyType',
  'formData.title': 'surveyData.title',
  'formData.delegateTeamName': 'surveyData.delegateTeamName',
  'formData.assessorTeamName': 'surveyData.assessorTeamName',
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
    delegateTeamName
    assessorTeamName
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
  delegateTeamName: 'delegateTeamName',
  assessorTeamName: 'assessorTeamName',
  surveyType: 'surveyType',
  'leadershipBrand.id': 'leadershipBrand',
  organization: 'organization',
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
  'formData.organization.id': 'surveyData.organization',
  'formData.leadershipBrand': 'surveyData.leadershipBrand',
  'formData.surveyType': 'surveyData.surveyType',
  'formData.title': 'surveyData.title',
  'formData.startDate': 'surveyData.startDate',
  'formData.delegateTeamName': 'surveyData.delegateTeamName',
  'formData.assessorTeamName': 'surveyData.assessorTeamName',
  'formData.endDate': 'surveyData.endDate',
  'formData.mode': 'surveyData.mode',
  'formData.status': 'surveyData.status',
};

export const uiSchema = {
  submitIcon: 'save',
  'ui:options': {
    submitProps: {
      variant: 'button',
      text: '${props.mode === "edit" ? "Update" : "Create" }',
      color: 'primary',      
      iconAlign: 'left'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      organization: { md: 12 },
    },
    {
      leadershipBrand: { md: 6 },
      surveyType: { md: 6 },
      delegateTeamName: {md: 6},
      assessorTeamName: {md: 6},
    },
    {
      title: { md: 12 },
    },
    {
      startDate: { md: 6 },
      endDate: { md: 6 },
    },
    {
      mode: { md: 6 },
      status: { md: 6 },
    },
  ],
  id: {
    'ui:widget': 'HiddenWidget',
    'ui:emptyValue': '',
  },
  organization: {
    'ui:widget': 'CompanyLogoWidget',
    'ui:options': {
      widget: 'CompanyLogoWidget',
      readOnly: true,
      noLookup: true,
      mapping: {
        'formData.id': 'id',
        'formData.logo': 'logo',
      },
      style: {
        maxWidth: '512px',
        width: '512px',
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '8px',
        marginBottom: '8px',
        display: 'flex',
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
        { key: 'plc', value: 'plc', label: 'Purposeful Leadership Company' },
        { key: '180', value: '180', label: 'TowerStone 180 Team Assessment' },
        { key: '360', value: '360', label: 'TowerStone 360 Personal Assessment' },
        { key: 'i360', value: 'i360', label: 'Mores Individual 360' },
        { key: 'l360', value: 'l360', label: 'Mores Leadership 360' },
        { key: 'culture', value: 'culture', label: 'Mores Culture Survey' },
        { key: 'team180', value: 'team180', label: 'Mores Team 180' },
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


export const TowerStoneSurveyConfigForm : Reactory.IReactoryForm = {
  id: 'TowerStoneSurveyConfig',
  title: 'TowerStone Survey Configuration',
  nameSpace: FormNameSpace,
  name: 'TowerStoneSurveyConfig',
  version: '1.0.0',
  uiFramework: 'material',
  uiSupport: ['material'],
  registerAsComponent: true,
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: defaultFormValue,
  backButton: true,
  helpTopics: ['survey-config-main'],
  graphql: {
    query: {
      name: 'surveyDetail',
      text: surveyQuery,
      variables: queryMap,
      resultMap: queryResultMap,
      new: false,
      edit: true,
    },
    mutation: {
      new: {
        name: 'createSurvey',
        text: createMutation,
        objectMap: true,
        variables: createMutationMap,
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'redirect',
        onSuccessUrl: 'admin/org/${formData.organization}/surveys/${createSurvey.id}',
        onSuccessRedirectTimeout: 1000,
      },
      edit: {
        name: 'updateSurvey',
        text: updateMutation,
        objectMap: true,
        variables: updateMutationMap,
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'refresh',
      },
    },
  },
};
