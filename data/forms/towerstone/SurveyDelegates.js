import pf from '../defs';


export const SurveyDelegatesSchema = {
  type: 'object',
  description: 'Manage the delegates for the survey',
  title: 'Survey Delegates',
  required: [],
  properties: {
    launched: {
      type: 'number',
      title: 'Launched',
    },
    complete: {
      type: 'number',
      title: 'Completed',
    },
    peersPending: {
      type: 'number',
      title: 'Peers Pending',
    },
    total: {
      type: 'number',
      title: 'Total',
    },
    delegates: {
      type: 'array',
      title: 'Delegate List',
      description: 'Manage your delegate list, use the control panel to launch, send reminders or close all assessments.',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            title: 'Entry Id',
          },
          selected: {
            type: 'boolean',
            title: 'Selected',
            default: false,
          },
          complete: {
            type: 'boolean',
            title: 'All Assessments Complete',
            default: false,
            readOnly: true,
          },
          launched: {
            type: 'boolean',
            title: 'Launched',
            default: false,
            readOnly: true,
          },
          removed: {
            type: 'boolean',
            title: 'Removed',
            default: false,
            readOnly: true,
          },
          delegate: {
            type: 'string',
            title: 'Delegate',
          },
          assessments: {
            type: 'array',
            title: 'Assessments',
            items: {
              type: 'object',
              title: 'Assessment',
              properties: {
                assessor: {
                  type: 'string',
                  title: 'Assessor',
                },
                complete: {
                  type: 'boolean',
                  title: 'Complete',
                },
                selfAssessment: {
                  type: 'boolean',
                  title: 'Self Assessment',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const SurveyDelegatesUISchema = {
  submitIcon: 'check_circle_outline',
  'ui:options': {
    showSubmit: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      delegates: { md: 12 },
    },
  ],
  id: {
    'ui:widget': 'HiddenWidget',
  },
  launched: {
    'ui:widget': 'ProgressWidget',
    'ui:options': {
      size: 80,
      thickness: 5,
      variant: 'static',
    },
  },
  complete: {
    'ui:widget': 'ProgressWidget',
    'ui:options': {
      size: 80,
      thickness: 5,
      variant: 'static',
    },
  },
  peersPending: {
    'ui:widget': 'ProgressWidget',
    'ui:options': {
      size: 80,
      thickness: 5,
      variant: 'static',
    },
  },
  total: {
    'ui:widget': 'ProgressWidget',
    'ui:options': {
      size: 80,
      thickness: 5,
      variant: 'static',
    },
  },
  delegates: {
    'ui:widget': 'SurveyDelegatesWidget',
  },
};

const graphql = {
  query: {
    name: 'surveyDetail',
    text: `query SurveyDetail($surveyId: String!){
      surveyDetail(surveyId: $surveyId){
        id
        statistics
        delegates {
          id          
          delegate {
            id
            email
            firstName
            lastName
            avatar
          }
          status
          message
          launched
          complete
          removed                  
          assessments {
            id
            assessor {
              id
              email
              firstName
              lastName
              avatar
            }
            complete
            createdAt
          }
        }        
      }
    }`,
    variables: {
      'formContext.surveyId': 'surveyId',
    },
    resultMap: {
      id: 'id',
      'statistics.launched': 'launched',
      'statistics.peersPending': 'peersPending',
      'statistics.total': 'total',
      'statistics.complete': 'complete',
      delegates: 'delegates',
    },
    edit: true,
    new: false,
  },
  mutation: {
    edit: {
      name: 'setDelegatesForSurvey',
      text: `mutation SetDelegatesForSurvey($id: String!, $delegates: [DelegateInput]){
        setDelegatesForSurvey(id: $id, delegates: $delegates){
          id                                    
        }
      }`,
      objectMap: true,
      variables: {
        'formContext.surveyId': 'id',
        'formData[].id': 'delegates.id',
        'formData[].delegate.id': 'delegates[].delegate',
        'formData[].launched': 'delegates[].launched',
        'formData[].complete': 'delegates[].complete',
        'formData[].removed': 'delegates[].removed',
      },
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'refresh',
    },
  },
};

export const SurveyDelegatesForm = {
  id: 'TowerStoneSurveyDelegateConfig',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Survey Delegate Management',
  tags: ['Survey Settings Editor', 'Forms'],
  schema: SurveyDelegatesSchema,
  icon: 'check_circle_outline',
  registerAsComponent: true,
  name: 'TowerStoneSurveyDelegateConfig',
  nameSpace: 'forms',
  version: '1.0.0',
  helpTopics: ['survey-delegate-config'],
  uiSchema: SurveyDelegatesUISchema,
  defaultFormValue: {
    launched: 0,
    complete: 0,
    peersPending: 0,
    total: 0,
    delegateEntries: [],
  },
  graphql,
};
