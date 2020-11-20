import { FormNameSpace } from '../constants';
import $defaultExport from './exports/SurveyDelegateExcelExport';
import $TeamSurveyDelegateExport from './exports/TeamSurveyDelegateExcelExport';
import { Reactory } from '@reactory/server-core/types/reactory';

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
          message: {
            type: 'string',
            title: 'Message'
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

const GetTableOptions = () => {

  return {
    columns: [
      {
        title: 'Delegate',
        field: 'delegate',
        component: 'core.LabelComponent@1.0.0',
        props: {
          uiSchema: {
            'ui:options': {
              variant: 'body2',
              format: '${rowData.delegate.firstName} ${rowData.delegate.lastName}'
            }
          },
        },
      },
      {
        title: 'Status',
        field: 'message',
        component: 'core.LabelComponent@1.0.0',
        props: {
          uiSchema: {
            'ui:options': {
              variant: 'body2',
              format: '${rowData.message}'
            }
          },
        },
      },
      {
        title: 'Removed',
        field: 'removed',
        component: 'core.LabelComponent@1.0.0',
        props: {
          uiSchema: {
            'ui:options': {
              variant: 'body2',
              format: '${rowData.removed === true ? "Removed" : "Active"}'
            }
          },
        },
      },
      {
        title: 'Launched',
        field: 'launched',
        component: 'core.LabelComponent@1.0.0',
        props: {
          uiSchema: {
            'ui:options': {
              variant: 'body2',
              format: '${rowData.launched === true ? "Launched" : "Waiting"}'
            }
          },
        },
      },
      {
        title: 'Last Action',
        field: 'lastAction',
        component: 'core.LabelComponent@1.0.0',
        props: {
          uiSchema: {
            'ui:options': {
              variant: 'body2',
              format: '${rowData.lastAction}'
            }
          },
        },
      }
    ],
    options: {
      grouping: true,
      search: true,
      showTitle: true,
      toolbar: true,
      selection: true,
      pageSize: 10,
    },
    componentMap: {
      Toolbar: 'mores.SurveyDelegateAdminToolbar@1.0.0'
    },
  }
};

export const SurveyDelegatesUISchema = {  
  'ui:options': {
    showSubmit: false,
    showSchemaSelectorInToolbar: true,
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


export const SurveyDelegatesGridUISchema = {
  'ui:options': {
    showSubmit: false,
    showSchemaSelectorInToolbar: true,
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
    'ui:widget': 'MaterialTableWidget',
    'ui:options': GetTableOptions()
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
        startDate
        endDate
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
      'status': 'status',
      'startDate': 'startDate',
      'endDate': 'endDate',
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

const SurveyDelegateStatusReport: Reactory.IReactoryPdfReport = {
  title: 'Survey Status Report',
  report: 'survey-status-delegates',
  folder: 'towerstone',
  method: 'post',
  delivery: 'inline',
  reportTitle: 'Survey Status Report',
  waitingText: 'Please wait loading status report',
  dataMap: {
    'id': 'id',
  }
};

const Survey180Report: Reactory.IReactoryPdfReport = {
  title: 'Team 180 Report',
  report: 'delegate-180-assessment',
  folder: 'towerstone',
  method: 'post',
  delivery: 'inline',
  reportTitle: 'Survey Status Report',
  waitingText: 'Please wait loading status report',
  dataMap: {
    'id': 'surveyId',
    'delegates[0].id': 'delegateId'
  }
};

export const TowerStoneSurveyDelegateConfig: Reactory.IReactoryForm = {
  id: 'TowerStoneSurveyDelegateConfig',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Survey Delegate Management',
  tags: ['Survey Settings Editor', 'Forms'],
  schema: SurveyDelegatesSchema,
  registerAsComponent: true,
  name: 'TowerStoneSurveyDelegateConfig',
  nameSpace: FormNameSpace,
  version: '1.0.0',
  helpTopics: ['survey-delegate-config'],
  widgetMap: [
    { widget: 'MoresSurveyDelegateWidget', componentFqn: 'mores.MoresSurveyDelegateWidget@1.0.0' }
  ],
  exports: [
    $defaultExport,
    $TeamSurveyDelegateExport
  ],
  defaultPdfReport: SurveyDelegateStatusReport,
  reports: [
    SurveyDelegateStatusReport,
    Survey180Report
  ],
  defaultExport: $defaultExport,
  uiSchema: SurveyDelegatesUISchema,
  uiSchemas: [
    { 
      id: 'SurveyDelegateWidget',
      description: 'Use the delegate list view',
      icon: 'list',
      key: 'list',
      title: 'Survey Delegate List',
      uiSchema: SurveyDelegatesUISchema
    },
    { 
      id: 'SurveyDelegateGrid',
      description: 'Use the delegate grid view',
      icon: 'table',
      key: 'table',
      title: 'Survey Delegate Grid',
      uiSchema: SurveyDelegatesGridUISchema
    }
  ],
  defaultFormValue: {
    launched: 0,
    complete: 0,
    peersPending: 0,
    total: 0,
    delegateEntries: [],
  },
  graphql,
};
