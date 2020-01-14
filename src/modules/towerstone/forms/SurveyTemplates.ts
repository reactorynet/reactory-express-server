import { FormNameSpace } from "../constants";
import { fileAsString } from "utils/io";
import { UIFrameWork } from "@reactory/server-core/types/constants";
import { Reactory } from "@reactory/server-core/types/reactory";

const froalaOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  imageManagerLoadMethod: 'GET',    
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

const emailTemplate: Reactory.IObjectSchema = {
  title: 'Email Template',
  type: 'object',
  properties: {
    key: {
      type: 'string',
      title: 'key'
    },
    activity: {
      type: 'string',
      title: 'Email Activity'
    },
    engine: {
      type: 'string',
      title: 'Engine'
    },
    target: {
      type: 'string',
      title: 'Target'
    },
    subject: {
      type: 'string',
      title: 'Subject Line',      
    },
    body: {
      type: 'string',
      title: 'Body'
    }
  }
};

const emailTemplateUiSchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
        activity: { md: 4 },
        target: { md: 4 },
        engine: { md: 4 },
    },
    {
        subject: { md: 12 },
        body: { md: 12 },
    }
  ],  
  key: {
    'ui:widget': 'HiddenWidget',    
  },
  activity: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Email Activity: ${formData}'
    }
  },
  target: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Target: ${formData}'
    }
  },    
  engine: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'ejs', value: 'ejs', label: 'EJS' },
        { key: 'lodash', value: 'lodash', label: 'lodash Template' },        
      ],
    },
  },
  subject: {

  },
  body: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  },
}

const $schema: Reactory.IObjectSchema = {
  title: "Survey Template",
  type: "object",
  properties: {
    id: {
      type: 'string',
      title: 'Survey Id',            
    },
    surveyType: {
      type: "string",
      title: "Survey Type",
      enum: ['180', '360',  'plc'],
      readOnly: true,
    },
    templates: {
      type: 'object',
      title: 'Templates',
      properties: {
        delegateTemplates: {
          type: 'array',
          title: 'Delegate Email Templates',
          items: {
            ...emailTemplate
          }
        },
        assessorTemplates: {
          type: 'array',
          title: 'Assessor Email Templates',
          items: {
            ...emailTemplate
          }
        }
      }
    }
  }
};


const $uiSchema: Object = { 
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
        surveyType: { md: 12 },
    },
    {
        templates: { md: 12 },
    }
  ],  
  surveyType: {
    'ui:options': {
      readOnly: true
    }  
  },
  templates: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        assessorTemplates: { md: 12 },
        delegateTemplates: { md: 12 },
      },      
    ],
    "assessorTemplates": {
      "items": {
        ...emailTemplateUiSchema
      }
    },
    "delegateTemplates": {
      "items": {
        ...emailTemplateUiSchema
      }
    }
  },
};

const $graphql: Reactory.IFormGraphDefinition = {
  query: {
    edit: true,
    new: false,
    delete: false,
    text: fileAsString(require.resolve('../graph/queries/TowerStoneGetSurveyTemplates.graphql')),
    name: 'surveyDetail',
    queryMessage: 'Loading Templates For Survey',
    resultMap: {
      'id': 'id',
      'surveyType': 'surveyType',
      'templates': 'templates',
    },
    variables: {
      'formContext.surveyId': 'surveyId'
    }
  }, 
  mutation: {
    edit: {
      name: "TowerStoneSurveySetTemplates",
      text: fileAsString(require.resolve('../graph/queries/TowerStoneSetSurveyTemplates.graphql')),
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {  
        'formData.templates' : 'templates',
        'formContext.surveyId'  : 'id'
      },
      onSuccessMethod: 'refresh'
    }
  } 
};

export const TowerStoneSurveyTemplatesForm: Reactory.IReactoryForm = {
  id: "TowerstoneSurveyTemplatesForm",
  nameSpace: FormNameSpace,
  name: "TowerStoneSurveyTemplatesForm",
  version: "1.0.0",
  title: "Survey Templates Form",
  description: "Form used to configure email templates for Survey",
  helpTopics: ['towerstone-survey-template-editing'],
  uiFramework: UIFrameWork.material,
  uiSupport: ['material'],
  uiResources: [],
  registerAsComponent: true,
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql,
};

export default TowerStoneSurveyTemplatesForm;