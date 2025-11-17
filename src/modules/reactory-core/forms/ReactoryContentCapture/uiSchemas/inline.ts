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
    'ui:widget': 'RichEditorWidget',
    'ui:title': null,
    'ui:options': {
      showLabel: false,
      options: inlineFroalaOptions,
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
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  langKey: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  publishDate: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  updatedAt: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  topics: {
    'ui:widget': 'HiddenWidget',   
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  }
};
