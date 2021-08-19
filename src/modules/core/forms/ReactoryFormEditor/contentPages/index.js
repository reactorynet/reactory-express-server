

export const ContentPagesForm = {
  id: 'PageEditorForm',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [

  ],
  title: 'Page Editor',
  tags: ['Page Editor'],
  nameSpace: 'forms',
  name: 'PageEditorForm',
  version: '1.0.0',
  registerAsComponent: true,
  componentDefs: [
    'core.PageIntegration',
    'froala.BoxCommercePlugin',
  ],
  schema: {
    title: 'Page Editor',
    description: 'Page Editor Form',
    type: 'object',
    properties: {
      WebsitePageId: {
        type: 'string',
        title: 'Page Id',
      },
      Title: {
        type: 'string',
        title: 'Page title',
      },
      Description: {
        type: 'string',
        title: 'Description',
      },
      HasDraft: {
        type: 'boolean',
        title: 'Has Draft',
      },
      HasPrevious: {
        type: 'boolean',
        title: 'Has Previous',
      },
      PageLayoutTemplate: {
        type: 'string',
        title: 'Description',
      },
      PageTemplate: {
        type: 'string',
        title: 'Page Template Id',
      },
      Path: {
        type: 'string',
        title: 'Path',
      },
      PreviousSavedDate: {
        type: 'string',
        title: 'Previous Saved Date',
      },
      Status: {
        type: 'string',
        title: 'Status',
        // enum: ['Hidden', 'Visible'],
      },
      Content: {
        type: 'string',
        title: 'Content',
      },
    },
  },
  uiSchema: {
    WebsitePageId: {
      'ui:options': {
        readOnly: true,
      },
    },
    Content: {
      'ui:widget': 'FroalaWidget',
      'ui:options': {
        froalaOptions: {
          // charCounterMax: 500,
          toolbarInline: true,
          // toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
          // toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
          fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file?storage=azure',
          videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video?storage=azure',
          imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image?storage=azure',
          requestHeaders: {
            'x-client-key': '${formContext.api.CLIENT_KEY}',
            'x-client-pwd': '${formContext.api.CLIENT_PWD}',
          },
        },
      },
    },
  },
  layout: {
    TabComponent: {
      id: 'site-tabs',
      tabs: [
        { title: 'General', key: 'general', fields: ['Title', 'Description'] },
        { title: 'Content', key: 'content', fields: ['Content'] },
      ],
    },
  },
};

export default ContentPagesForm;
