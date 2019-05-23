// import pf from '../defs';
import { BasicToolbar } from './utils';

export const TemplateSchema = {
  type: 'object',
  title: 'Template Editor',
  properties: {
    id: {
      type: 'string',
      title: 'Template Id',
    },
    content: {
      type: 'string',
      title: 'Template Content',
    },
  },
};

export const TemplateEditorUISchema = {
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

export const TemplateEditor = {
  id: 'TemplateEditor',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Template Editor',
  tags: ['Template Editor', 'Forms'],
  schema: TemplateSchema,
  registerAsComponent: true,
  name: 'TemplateEditor',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: TemplateEditorUISchema,
};

export const TemplateList = {
  id: 'TemplateList',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Template List',
  tags: ['Template Editor', 'Forms'],
  schema: {
    type: 'object',
    properties: {
      toolbar: { ...BasicToolbar },
      results: {
        type: 'array',
        items: {
          type: 'object',
          title: 'Template',
          properties: {
            id: {
              type: 'string',
              name: 'Template Id',
            },
            view: {
              type: 'string',
              name: 'View',
            },
            format: {
              type: 'string',
              name: 'Template Format',
            },
            content: {
              type: 'string',
              name: 'Content',
            },
          },
        },
      },
    },
  },
  uiSchema: {
    toolbar: {
      'ui:wrapper': 'Toolbar',
      'ui:options': {

      },
      search: {

      },
    },
  },
  registerAsComponent: true,
  name: 'TemplateList',
  nameSpace: 'forms',
  version: '1.0.0',
  graphql: {
    query: {
      new: true,
      edit: true,
      name: 'templates',
      text: `
      query Templates ( $client: String, $organization: String ) {
        templates (client: $client, organization: $organization) {
          id
          view
          format
          content             
        }
      }
      `,
      variables: {

      },
      resultMap: {
        id: 'id',
        view: 'view',
        format: 'status',
        content: 'content',
      },
    },
  },
};

export default {
  TemplateEditor,
  TemplateList,
};
