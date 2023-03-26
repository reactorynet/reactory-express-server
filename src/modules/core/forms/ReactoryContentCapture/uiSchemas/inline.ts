import { inlineFroalaOptions } from '../froala'

export const inlineEditor: Reactory.Schema.IFormUISchema = {

  'ui:options': {
    containerType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
    showHelp: false,
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      showLabel: false,
      froalaOptions: inlineFroalaOptions,
    },
  },
  title: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  slug: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  createdAt: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },

  published: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    },
    readOnly: true,
    hidden: true
  },
  author: {
    'ui:widget': 'HiddenWidget',
  },
  topics: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      container: 'core.BasicContainer',
      style: {
        display: 'none',
        maxHeight: '0px',
      },
      containerProps: {
        title: 'Page Tags',
        style: {
          display: "none"
        },
      },
    },
  }
};
