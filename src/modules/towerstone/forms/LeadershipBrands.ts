import { UIFrameWork } from "@reactory/server-core/types/constants";
import Reactory from "@reactory/server-core/types/reactory";
import { FormNameSpace } from "../constants";

const propsFactory = require('../../../data/forms/defs').default;

export const LeadershipBrandSchema: Reactory.ISchema  = {
  title: 'Leadership Brand Configuration',
  description: 'Use the form below to configure your Leadership brand',
  type: 'object',
  required: ['title', 'description', 'scale', 'qualities'],
  helpTopics: ['LeadershipBrands', 'Survey Admin', 'Surveys'],
  properties: {
    id: {
      type: 'string',
      title: 'Id',
    },
    title: propsFactory.StringProperty('Brand Title', 'Title for the leadership brand', 5, 150),
    description: propsFactory.StringProperty('Brand Statement', 'Provide a meaningful brand statement', 20, 500),
    qualityDisplay: {
      type: 'string',
      title: 'Quality Display Format',
    },
    scale: {
      type: 'string',
      title: 'Scale',
    },
    qualities: {
      title: 'Qualitlies',
      type: 'array',
      minLength: 1,
      items: {
        type: 'object',
        title: 'Quality',
        properties: {
          id: propsFactory.StringProperty('Quality Id', 'Quality Id - System Assigned'),
          title: propsFactory.StringProperty('Quality Title', 'Title for the Quality', 10, 150),
          description: propsFactory.StringProperty('Quality Description', 'Provide a meaningful description for the quality', 0, 200),
          ordinal: {
            type: 'number',
            title: 'Ordinal',
            description: 'Used to determine the order of the quality question',
          },
          behaviours: {
            type: 'array',
            title: 'Behaviours',
            minLength: 1,
            items: {
              type: 'object',
              title: 'Behaviour',
              properties: {
                id: propsFactory.StringProperty('Behaviour Id', 'Behaviour Id - System Assgined'),
                description: propsFactory.StringProperty('Behaviour Description', 'Provide a meaningful description for the behaviour', 10, 250),
                ordinal: {
                  type: 'number',
                  title: 'Ordinal',
                  description: 'Used to determine the order of the behaviour in relation to the rest',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const defaultFormValue = {
  scale: '',
  qualities: [
    {
      ordinal: 1,
      behaviours: [
        {
          ordinal: 1,
        },
      ],
    },
  ],
};

export const createBrandForOrganization = `
mutation CreateBrandMutation($brandInput: BrandInput!, $organizationId: String!){
  createBrandForOrganization(brandInput: $brandInput, organizationId: $organizationId){
    id
    title
    description      
    scale {
      id
      key
      title
      entries {
        rating
        description
      }
    }      
    qualities {
      ordinal        
      title
      description
      behaviours {
        ordinal
        description
      }      
    }
  } 
}
`;

export const mutationMap = {
  'formData.id': 'brandInput.id',
  'formData.title': 'brandInput.title',
  'formData.description': 'brandInput.description',
  'formData.scale.id': 'brandInput.scale',
  'formData.qualities': 'brandInput.qualities',
};


export const updateBrandForOrganization = `
mutation UpdateBrandForOrganization($brandInput: BrandInput!, $organizationId: String!){
  updateBrandForOrganization(brandInput: $brandInput, organizationId: $organizationId){
    id
    title
    description      
    scale {
      id
      key
      title
      entries {
        rating
        description
      }
    }      
    qualities {
      ordinal        
      title
      description
      behaviours {
        ordinal
        description
      }      
    }
  } 
}
`;


export const brandWithId = `
  query BrandWithId($brandId: String!){
    brandWithId(brandId: $brandId){
      id,
      title
      description
      qualityDisplay
      archived
      scale {
        id
        key
        title
        min
        max
        entries {
          rating
          description
        }
      }
      qualities {
        id
        title
        description
        ordinal
        behaviours {
          id
          description
          title
          ordinal      
        }
      }
    }
  }
`;

export const queryMap = {
  'formContext.brandId': 'brandId',
  'formContext.organizationId': 'organizationId',
};

export const uiSchema = {
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
  },
  qualities: {
    items: {
      id: {
        'ui:widget': 'HiddenWidget',
      },
      description: {
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
    },
  },
};


export const TowerStoneLeadershipBrandConfigForm: Reactory.IReactoryForm = {
  id: 'TowerStoneLeadershipBrandConfig',
  title: 'TowerStone Leadership Brand Configuration',  
  nameSpace: FormNameSpace,
  uiFramework: UIFrameWork.material,
  uiSupport: [ UIFrameWork.material ],
  name: 'TowerStoneLeadershipBrandConfig',
  helpTopics: ['Create Leadership Brand'],
  version: '1.0.0',
  registerAsComponent: true,
  schema: LeadershipBrandSchema,
  uiSchema,
  defaultFormValue,
  workflow: {
    onSave: {
      id: 'towerstone.LeadershipBrandOnSave',
      properties: {
        'formData.id': 'brandId',
      },
    },
  },
  graphql: {
    query: {
      name: 'brandWithId',
      text: brandWithId,
      new: false,
      edit: true,
      variables: queryMap,
      delete: false,
      queryMessage: 'Loading Brand',      
    },
    mutation: {
      new: {
        name: 'createLeadershipBrand',
        text: createBrandForOrganization,
        objectMap: true,
        variables: mutationMap,
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'route',
        onSuccessUrl: 'admin/org/${formData.organization}/brands/${createLeadershipBrand.id}', // eslint-disable-line
        onSuccessRedirectTimeout: 1000,
      },
      edit: {
        name: 'updateBrandForOrganization',
        text: updateBrandForOrganization,
        objectMap: true,
        variables: mutationMap,
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'route',
        onSuccessUrl: 'admin/org/${formData.organization}/brands/${updateBrandForOrganization.id}?refresh=${new Date().valueOf()}', // eslint-disable-line
        onSuccessRedirectTimeout: 1000,
      },
    },
  },
};


