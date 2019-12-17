import pf from '../../../data/forms/defs';
import { FormNameSpace } from '../constants';
import $defaultExport from './exports/SurveyDelegateExcelExport';

export const SurveyDelegatesSchema = {
  type: 'object',
  description: 'Manage the delegates for the survey',
  title: 'Survey Delegates',
  required: [],
  properties: {
    title: {
      type: 'string',
      title: 'Survey Title'
    },
    surveyType: {
      type: 'string',
      title: 'Survey Type'
    },
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
    {
      launched: { md: 3, sm: 6 },
      complete: { md: 3, sm: 6 },
      total: { md: 3, sm: 12 }
    }
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
    'ui:widget': 'LabelWidget',    
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
        title
        statistics
        delegateTeamName
        assessorTeamName
        surveyType
        status
        delegates {
          id          
          delegate {
            id
            email
            firstName
            lastName
            avatar
          }
          team
          status
          peers {
            user {
              id
              firstName
              lastName
          }
          organization {
              id
              name
              avatar                        
          },
          peers {
              user {
                  id
                  firstName
                  lastName
                  email
                  avatar
              }
              isInternal
              inviteSent
              confirmed
              confirmedAt
              relationship                        
          }
          allowEdit
          confirmedAt
          createdAt
          updatedAt            
          }
          message
          launched
          complete
          removed    
          lastAction
          nextAction              
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
      'surveyType': 'surveyType',
      'statistics.launched': 'launched',
      'statistics.peersPending': 'peersPending',
      'statistics.total': 'total',
      'statistics.complete': 'complete',
      delegates: 'delegates',
      assessorTeamName: 'assessorTeamName',
      delegateTeamName: 'delegateTeamName'
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

export const TowerStoneSurveyDelegateConfig = {
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
  nameSpace: FormNameSpace,
  version: '1.0.0',
  helpTopics: ['survey-delegate-config'],
  defaultPdfReport: {
    report: 'survey-status-delegates',
    folder: 'towerstone',
    method: 'post',
    delivery: 'inline',
    reportTitle: 'Survey Status Report',
    waitingText: 'Please wait loading status report',
    dataMap: {
      'surveyId': 'id',
    }
  },
  defaultExport: $defaultExport,
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
