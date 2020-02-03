const uiSchema = {
  'ui:toolbar': {
    buttons: [
      {
        command: 'copyLeadershipBrand',
        id: 'copyLeadershipBrand',
        color: 'primary',
        icon: 'file_copy',
        tooltip: 'Copy this leadershipbrand for another organization',
        action: 'component',
        component: {
          componentFqn: 'core.SlideOutLauncher',
          props: {
            componentFqn: 'towerstone.CopyLeadershipBrand',
            componentProps: {

            },
            propsMap: {
              'formData.organizationId': 'formData.SourceOrganization',
              'formData.brandId': 'formData.SourceLeadershipBrand',
              'formData.title': 'formData.TargetTitle'
            },
          },
        },
      }
    ]
  },
  id: {
    'ui:widget': 'HiddenWidget',
  },
  scale: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      query: `query Scales{
        allScales{
          id,
          title
        }
      }`,
      resultItem: 'allScales',
      resultsMap: {
        'allScales.[].id': ['[].key', '[].value'],
        'allScales.[].title': '[].label',
      },
    },
  },
  qualityDisplay: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'title', value: 'title', label: 'Title Only' },
        { key: 'description', value: 'description', label: 'Description Only' },
        { key: 'both', value: 'both', label: 'Both' },
      ],
    },
  },
  description: {
    /*
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions: {
        charCounterMax: 500,
        toolbarInline: false,
        // toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
        // toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
        fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
        videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
        imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
        requestHeaders: {
          'x-client-key': '${formContext.api.CLIENT_KEY}',
          'x-client-pwd': '${formContext.api.CLIENT_PWD}',
        },
      },
    },
    */
  },
  qualities: {
    items: {
      id: {
        'ui:widget': 'HiddenWidget',
      },
      description: {
        /*
        'ui:widget': 'FroalaWidget',
        'ui:options': {
          froalaOptions: {
            placeHolder: 'Provide a description for the quality',
            charCounterMax: 200,
            toolbarInline: false,
            toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
            toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
            fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
            videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
            imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
            requestHeaders: {
              'x-client-key': '${formContext.api.CLIENT_KEY}',
              'x-client-pwd': '${formContext.api.CLIENT_PWD}',
            },
          },
        },
        */
      },
      ordinal: {
        'ui:widget': 'HiddenWidget',
        'ui:options': {
          readOnly: true,
        },
      },
      behaviours: {
        items: {
          id: {
            'ui:widget': 'HiddenWidget',
          },
          ordinal: {
            'ui:widget': 'HiddenWidget',
            'ui:options': {
              readOnly: true,
            },
          },
          description: {
            /*
            'ui:widget': 'FroalaWidget',
            'ui:options': {
              froalaOptions: {
                charCounterMax: 200,
                toolbarInline: false,
                toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
                toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
                fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
                videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
                imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
                requestHeaders: {
                  'x-client-key': '${formContext.api.CLIENT_KEY}',
                  'x-client-pwd': '${formContext.api.CLIENT_PWD}',
                },
              },
            },
            */
          },
        },
      },
    },
  },
};

export default uiSchema;