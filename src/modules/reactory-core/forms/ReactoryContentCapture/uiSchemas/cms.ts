import Reactory from '@reactorynet/reactory-core';
import { minmalExtendedOptions } from '../froala';

export const cmsEditor: Reactory.Schema.IFormUISchema = {
  'ui:options': {
    containerType: 'Paper',
    containerStyles: {
      padding: '16px',
      margin: '0px',
    },
    showSubmit: true,
    showRefresh: true,
    showHelp: true,
  },
  'ui:field': 'TabbedLayout',
  'ui:tabs': [
    {
      id: 'content-tab',
      title: 'Content & Editor',
      icon: 'article',
      fields: ['title', 'slug', 'content'],
    },
    {
      id: 'metadata-tab',
      title: 'Metadata & Tags',
      icon: 'label',
      fields: ['description', 'topics', 'locale', 'version'],
    },
    {
      id: 'template-tab',
      title: 'Template & Options',
      icon: 'settings_suggest',
      fields: ['template', 'engine', 'previewInputForm', 'helpTopic'],
    },
    {
      id: 'publishing-tab',
      title: 'Publishing',
      icon: 'publish',
      fields: ['published', 'publishDate', 'createdAt', 'updatedAt'],
    },
  ],

  slug: {
    'ui:placeholder': 'e.g. about-reactory',
  },
  title: {
    'ui:placeholder': 'Enter content title...',
  },
  description: {
    'ui:widget': 'TextAreaWidget',
    'ui:options': {
      rows: 3,
      placeholder: 'Short summary or overview...',
    },
  },
  content: {
    'ui:widget': 'RichEditorWidget',
    'ui:title': null,
    'ui:options': {
      froalaOptions: minmalExtendedOptions,
    },
  },
  topics: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      placeholder: 'Add tag and press enter...',
    },
  },
  published: {
    'ui:widget': 'SwitchWidget',
  },
  template: {
    'ui:widget': 'SwitchWidget',
  },
  engine: {
    'ui:widget': 'SelectWidget',
  },
};

export default cmsEditor;
