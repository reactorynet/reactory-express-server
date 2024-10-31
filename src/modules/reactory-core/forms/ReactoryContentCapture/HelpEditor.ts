import { defaultFormProps } from '@reactory/server-core/data/forms/defs';

export const HelpSchema = {
  type: 'object',
  title: 'Help Editor',
  properties: {
    id: {
      type: 'string',
      title: 'Help Id',
    },
    keyword: {
      type: 'string',
      title: 'Key Word',
    },
    content: {
      type: 'string',
      title: 'Help Content',
    },
  },
};

export const HelpFormEditUISchema = {
  id: {
    'ui:widget': 'HiddenWidget',
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      'ui:options': {
        froalaOptions: {
          toolbarInline: false,
          toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline',
            'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
          toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
        },
      },
    },
  },
};

export const HelpFormEdit = {
  id: 'HelpEditor',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Help Editor',
  tags: ['Help Editor', 'Forms'],
  schema: HelpSchema,
  registerAsComponent: true,
  name: 'HelpEditor',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: HelpFormEditUISchema,
};

export const HelpListSchema = {
  type: 'object',
  title: 'Help List',
  description: 'List of Help Topics',
  required: [],
  properties: {
    searchInput: {
      type: 'string',
      title: 'Filter',
    },
  },
};

export const HelpListUISchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      searchInput: { sm: 12 },
    },
  ],
};


export const HelpListForm = {
  id: 'HelpListForm',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Help Content',
  tags: ['Help Editor', 'Forms'],
  schema: HelpListSchema,
  registerAsComponent: true,
  name: 'HelpListForm',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: HelpListUISchema,
};


export default {
  HelpListForm,
  HelpFormEdit,
};
