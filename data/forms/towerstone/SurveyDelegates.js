import pf from '../defs'


export const SurveyDelegatesSchema = {
  type: 'object',
  title: 'Delegates',
  description: 'Delegates for Survey',
  properties: {
    survey: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        title: {
          type: 'string',
        },
      },
    },
    delegates: {
      type: 'array',
      items: {
        delegate: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              title: 'First Name',
            },
          },
        },
      },
    },
  },
};

export const SurveyDelegatesUISchema = {

};

export const SurveyDelegatesForm = {
  id: 'SurveyDelegatesForm',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Survey Settings',
  tags: ['Survey Settings Editor', 'Forms'],
  schema: SurveyDelegatesSchema,
  registerAsComponent: true,
  name: 'SurveySettingsForm',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: SurveyDelegatesUISchema,
};