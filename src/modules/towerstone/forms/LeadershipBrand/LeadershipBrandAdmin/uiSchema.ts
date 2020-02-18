import { santizeQualitySpec } from './schema';

const uiSchema = {  
  'ui:field': 'GridLayout',
  'ui:grid-layout': [    
    {
      title: { md: 6, sm: 12 },
      scale: { md: 6, sm: 12 },
      description: { md: 12 }
    },    
    {
      qualityDisplay: { md: 12 },
      qualities: { md: 12 }
    }
  ], 
  /*
  ,
  */
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
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'id',      
      primaryText: '${item.title || "Edit Quality"}',
      secondaryText: '${item.description}',
      variant: 'button',
      allowAdd: true,
      title: "Leadership Brand Qualities",
      secondaryAction: {
        iconKey: 'edit',
        label: 'Edit',
        componentFqn: 'core.SlideOutLauncher@1.0.0',
        action: 'mount:Component',                  
        props: {
          componentFqn: 'towerstone.QualityFormWidget@1.0.0',            
          componentProps: {
            'formData': 'formData',
            'onChange':'onSubmit'
          },
          buttonIcon: 'edit',
          slideDirection: 'down',
          buttonTitle: 'View Details',
          windowTitle: 'Edit Quality',
          buttonVariant: 'IconButton',
        },        
      }
    },
    /*
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
          },
        },
      },
    },*/
  },
};

export default uiSchema;