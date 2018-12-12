export const SurveySettingsSchema = {
  type: 'object',
  title: 'Survey Settings',
  properties: {
    defaultMinimumPeers: {
      type: 'boolean',
      title: 'Use default minimum peers'
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
  },
};

export const SurveySetttingsUISchema = {
  spreadReminders: {
    'ui:widget': 'SelectWidhet',
    'ui:optios': {
      selectOptions: [
        { key: 'even', value: 'even', label: 'Evenly Across Work Days' },
        { key: 'halfway', value: 'halfway', label: 'Starts Sending Halfway through' },
        { key: 'custom', value: 'custom', label: 'Custom Calendar' },
      ],
    }
  }
};

export const SurveySettingsForm = {
  id: 'TowerStoneSurveySettingsForm',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Survey Settiings',
  tags: ['Survey Settings Editor', 'Forms'],
  schema: SurveySettingsSchema,
  registerAsComponent: true,
  name: 'SurveySettingsForm',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: SurveySetttingsUISchema,
};
