
import { Reactory } from "@reactory/server-core/types/reactory";
import propsFactory from '@reactory/server-core/data/forms/defs';
import { jzon } from "@reactory/server-core/utils/validators";


export const behaviourSchema: Reactory.ISchema = {
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
};


export const qualitySchema : Reactory.ISchema = {
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
      items: behaviourSchema,
    },
  },
};

const schema: Reactory.ISchema  = {
  title: 'Leadership Brand Configuration',
  description: 'Use the form below to configure your Leadership brand',
  type: 'object',
  required: ['title', 'description', 'scale', 'qualities'],  
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
      items: qualitySchema,
    },
  },
};

export const sanitizeBehaviourSpec: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    description: { type: 'string', minLength: 10, maxLength: 250, def: "Add description" },
    ordinal: {
      type: 'number',
      min: 0,
    },
  },
};

export const sanitizeBehavioursSpec: Reactory.IArraySchema = {  
  type: 'array',        
  items: sanitizeBehaviourSpec  
};

export const santizeQualitySpec: Reactory.ISchema = {
  type: 'object',
  properties: {
    title: { type: 'string', rules: ['trim', 'title'], def: 'Quality Title', optional: false },
    description: {type: 'string', rules: ['trim'], def: "Description" },
    ordinal: { type: 'integer', min: 0 , def: 0 },
    behaviours: sanitizeBehavioursSpec
  }
};

export const santizeQualitiesSpec: Reactory.IArraySchema = {
  type: 'array',
  items: santizeQualitySpec,
}

export const sanitizeSpec: Reactory.ISchema = {
  type: 'object',
  required: ['title', 'description', 'scale', 'qualities'],  
  properties: {    
    id: {
      type: 'string',
      rules: ['trim']            
    },
    title: { type: "string", minLength: 5, maxLength: 150 },
    description: { type: "string", minLength: 20, maxLength: 500 },
    qualityDisplay: {
      type: 'string',      
    },
    scale: {
      type: 'string',      
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
          
        },
      },
    },
  },
};

let defaultFormValue = {

};

const validationResult = jzon.validate(defaultFormValue, schema);

if(!validationResult.valid === true) {
  //
  defaultFormValue = jzon.sanitize(defaultFormValue, schema);
}

export default schema;