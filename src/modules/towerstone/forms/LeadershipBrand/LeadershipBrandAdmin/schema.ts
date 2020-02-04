
import { Reactory } from "@reactory/server-core/types/reactory";
import propsFactory from '@reactory/server-core/data/forms/defs';

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

export default schema;