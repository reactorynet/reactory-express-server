
const froalaOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
  },
};

const minmalOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
  },
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
  },
  quickInsertEnabled: false,
};

const minmalExtendedOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
    'moreRich': {
      'buttons': ['insertFile', 'insertLink', 'insertImage', 'insertVideo']
    },
  },
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
  },
  quickInsertEnabled: false,
};

export const minimalEdit = {
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

export const minimalExtendedEdit = {
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
      froalaOptions: minmalExtendedOptions,
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

export default {
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
    showRefresh: true,
    showHelp: true,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      slug: {
        xs: 12, sm: 12, md: 6, lg: 6
      },
      title: {
        xs: 12, sm: 12, md: 6, lg: 6
      }
    },
    {
      createdAt: {
        xs: 12, sm: 12, md: 6, lg: 6
      },
      published: {
        xs: 12, sm: 12, md: 6, lg: 6
      }
    },
    {
      content: { xs: 12, sm: 12, md: 12, lg: 12 }
    }
  ],

  slug: {
    // ? slug wiget?
  },
  createdAt: {
    'ui:widget': 'DateSelectorWidget',
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  },
  topics: {
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
  }
};


