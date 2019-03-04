export const SurveySettingsSchema = {
  type: 'object',
  title: 'Survey Settings',
  description: 'Configure the survey settings',
  properties: {
    defaultMinimumPeers: {
      type: 'boolean',
      title: 'Use default minimum peers',
    },
    minimumPeers: {
      type: 'number',
      title: 'Minimum Number of Peers',
      min: 1,
      max: 10,
    },
    maximumPeers: {
      type: 'number',
      title: 'Maximum Number of Peers',
    },
    minimumDirectReports: {
      type: 'number',
      title: 'Minimum Number of Direct Reports',
    },
    maximumDirectReport: {
      type: 'number',
      title: 'Maximum Number of Direct Report',
    },
    mustHaveSupervisor: {
      type: 'boolean',
      title: 'Must include a super visor',
    },
    numberOfReminders: {
      type: 'number',
      title: 'Number of reminders to send during survey',
    },
    spreadReminders: {
      type: 'string',
      title: 'How should reminders be spread',
    },
    maxReminders: {
      type: 'number',
      title: 'Maximum Number of reminders',
    },
    timeline: {
      type: 'array',
      title: 'Timeline Entries',
      items: {
        type: 'object',
        title: 'Entry',
        properties: {
          when: {
            type: 'string',
            title: 'When',
          },
          eventType: {
            type: 'string',
            title: 'Event Type',
          },
          eventDetail: {
            type: 'string',
            title: 'Event Detail',
          },
        },
      },
    },
  },
};

export const SurveySetttingsUISchema = {
  'ui:options': {
    showSubmit: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    /*
    {
      defaultMinimumPeers: { md: 6 },
      mustHaveSupervisor: { md: 6 },
    },
    {
      minimumPeers: { md: 6 },
      maximumPeers: { md: 6 },
    },
    {
      minimumDirectReports: { md: 6 },
      maximumDirectReport: { md: 6 },
    },
    {
      numberOfReminders: { md: 6 },
      maxReminders: { md: 6 },
    },
    {
      spreadReminders: { md: 12 },
    },
    */
    {
      timeline: { md: 12 },
    },

  ],
  minimumPeers: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      widget: 'SliderWidget',
    },
  },
  maximumPeers: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      widget: 'SliderWidget',
    },
  },
  minimumDirectReports: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      widget: 'SliderWidget',
    },
  },
  maximumDirectReport: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      widget: 'SliderWidget',
    },
  },
  numberOfReminders: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      widget: 'SliderWidget',
    },
  },
  maxReminders: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      widget: 'SliderWidget',
    },
  },
  spreadReminders: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'even', value: 'even', label: 'Evenly Across Work Days' },
        { key: 'halfway', value: 'halfway', label: 'Starts Sending Halfway through' },
        { key: 'custom', value: 'custom', label: 'Custom Calendar' },
      ],
    },
  },
  timeline: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'When', field: 'when' },
        { title: 'Event', field: 'eventType' },
        { title: 'Detail', field: 'eventDetail' },
      ],
    },
  },
};

const graphql = {
  query: {
    name: 'surveyDetail',
    text: `query SurveyDetail($surveyId: String!){
      surveyDetail(surveyId: $surveyId){
        id
        options
        timeline {
          when
          eventType
          eventDetail
          who {
            id
            firstName
            lastName
            avatar
          }
        }
      }
    }`,
    variables: {
      'formContext.surveyId': 'surveyId',
    },
    resultMap: {
      'options.defaultMinimumPeers': 'defaultMinimumPeers',
      'options.maxReminders': 'maxReminders',
      'options.maximumDirectReport': 'maximumDirectReport',
      'options.maximumPeers': 'maximumPeers',
      'options.minimumDirectReports': 'minimumDirectReports',
      'options.minimumPeers': 'minimumPeers',
      'options.mustHaveSupervisor': 'mustHaveSupervisor',
      'options.numberOfReminders': 'numberOfReminders',
      'options.spreadReminders': 'spreadReminders',
      timeline: 'timeline',
    },
    edit: true,
    new: false,
  },
  mutation: {
    edit: {
      name: 'updateSurveyOptions',
      text: `mutation UpdateSurveyOptions($id: String!, $options: Any){
        updateSurveyOptions(id: $id, options: $options)
      }`,
      objectMap: true,
      variables: {
        'formContext.surveyId': 'id',
        formData: 'options',
      },
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'refresh',
    },
  },
};

export const SurveySettingsForm = {
  id: 'TowerStoneSurveySettings',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Survey Settiings',
  tags: ['Survey Settings Editor', 'Forms'],
  schema: SurveySettingsSchema,
  registerAsComponent: true,
  defaultFormValue: {
    defaultMinimumPeers: true,
    minimumPeers: 6,
    maximumPeers: 6,
    minimumDirectReports: 6,
    maximumDirectReport: 6,
    mustHaveSupervisor: true,
    numberOfReminders: 3,
    spreadReminders: 'even',
    maxReminders: 3,
  },
  helpTopics: ['towerstone-survey-settings'],
  name: 'TowerStoneSurveySettings',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: SurveySetttingsUISchema,
  graphql,
};
