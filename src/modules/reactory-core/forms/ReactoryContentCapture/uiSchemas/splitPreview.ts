import Reactory from '@reactorynet/reactory-core';
import { minmalExtendedOptions } from '../froala';

export const splitPreviewEditor: Reactory.Schema.IFormUISchema = {
  'ui:options': {
    containerType: 'div',
    containerStyles: {
      padding: '0px',
      margin: '0px',
    },
    showSubmit: true,
    showRefresh: true,
    showHelp: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      title: { xs: 12, sm: 12, md: 8, lg: 8 },
      published: { xs: 12, sm: 12, md: 4, lg: 4 },
      content: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
  ],

  slug: {
    'ui:widget': 'HiddenWidget',
  },
  title: {
    'ui:placeholder': 'Title...',
  },
  content: {
    'ui:widget': 'RichEditorWidget',
    'ui:title': null,
    'ui:options': {
      froalaOptions: minmalExtendedOptions,
      splitPreview: true,
    },
  },
  published: {
    'ui:widget': 'SwitchWidget',
  },
};

export default splitPreviewEditor;
