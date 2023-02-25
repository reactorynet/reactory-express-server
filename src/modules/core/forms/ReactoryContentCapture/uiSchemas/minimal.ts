import { minmalOptions } from '../froala';

export const minimalEditor = {
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
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      showLabel: false,
      froalaOptions: minmalOptions,
    },
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