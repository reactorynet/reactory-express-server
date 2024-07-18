export const PageEditorForm = {
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
    'core.BasicContainer',
  ],
  helpTopics: [
    'Page Editor', 'Html Editing', 'Block Builder',
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
        title: 'Layout Template',
      },
      PageTemplate: {
        type: 'string',
        title: 'Page Template Id',
      },
      Tags: {
        type: 'array',
        title: 'Page Tags',
        items: {
          type: 'string',
          title: 'Tag',
        },
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
      SecondaryContent: {
        type: 'string',
        title: 'Secondary Content',
      },
    },
  },
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        Title: { md: 6 },
        HasDraft: { md: 3 },
        HasPrevious: { md: 3 },
        Description: { md: 12 },
      },
      {
        Path: { md: 6 },
        PreviousSavedDate: { md: 6 },
        Tags: { md: 3 },
        Status: { md: 3 },
      },
      {
        PageLayoutTemplate: { md: 6 },
        PageTemplate: { md: 6 },
        Content: { md: 12 },
      },
      {
        SecondaryContent: { md: 12 },
      },
    ],
    WebsitePageId: {
      'ui:widget': 'HiddenWidget',
      'ui:options': {
        readOnly: true,
      },
    },
    Tags: {
      'ui:widget': 'ChipArrayWidget',
      'ui:options': {
        container: 'core.BasicContainer',
        containerProps: {
          title: 'Page Tags',
          style: {
            maxWidth: '100%',
            justifyContent: 'flex-end',
          },
        },
      },
    },
    PreviousSavedDate: {
      'ui:widget': 'DateSelectorWidget',
    },
    Description: {
      'ui:widget': 'FroalaWidget',
      'ui:options': {
        froalaOptions: {
          charCounterMax: 500,
          toolbarInline: false,
          toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
          toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
          fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
          videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
          imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
          requestHeaders: {
            'x-client-key': '${formContext.reactory.CLIENT_KEY}',
            'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
          },
        },
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
          fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file?storage=azure',
          videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video?storage=azure',
          imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image?storage=azure',
          requestHeaders: {
            'x-client-key': '${formContext.reactory.CLIENT_KEY}',
            'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
          },
        },
      },
    },
    SecondaryContent: {
      'ui:widget': 'FroalaWidget',
      'ui:options': {
        froalaOptions: {
          // charCounterMax: 500,
          toolbarInline: false,
          toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html', 'blocks'],
          // toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
          fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
          videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
          imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
          imageManagerLoadURL: '${formContext.reactory.API_ROOT}/froala/image_manager',
          pluginsEnabled: ['customPlugin', 'imageManager', 'quickInsert', 'align', 'charCounter', 'codeBeautifier', 'codeView', 'colors', 'draggable',
            'embedly', 'emoticons', 'entities', 'file', 'fontAwesome', 'fontFamily', 'fontSize', 'fullscreen', 'image', 'imageTUI', 'imageManager',
            'inlineStyle', 'inlineClass', 'lineBreaker', 'lineHeight', 'link', 'lists', 'paragraphFormat', 'paragraphStyle', 'quickInsert',
            'quote', 'save', 'table', 'url', 'video', 'wordPaste'],
          requestHeaders: {
            'x-client-key': '${formContext.reactory.CLIENT_KEY}',
            'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
          },
        },
      },
    },
    Status: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'planned', value: 'planned', label: 'Planned' },
          { key: 'in-progress', value: 'in-progress', label: 'Draft' },
          { key: 'in-progress', value: 'Hidden', label: 'Hidden' },
          { key: 'complete', value: 'complete', label: 'Pubilshed' },
        ],
      },
    },
  },
};

export default PageEditorForm;
