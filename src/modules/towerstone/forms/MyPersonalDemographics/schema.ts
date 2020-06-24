import { Reactory } from '@reactory/server-core/types/reactory';
const schema: Reactory.ISchema = {
  type: 'object',
  title: 'My Personal Demographics',
  properties: {
    id: {
      type: 'string',
      title: 'Client Id'
    },
    race: {
      type: 'string',
      title: 'Race'
    },
    age: {
      type: 'string',
      title: 'Age'
    },
    gender: {
      type: 'string',
      title: 'Gender'
    },
    pronoun: {
      type: 'string',
      title: 'Pronoun Group'
    },
    position: {
      type: 'string',
      title: 'Position'
    },
    region: {
      type: 'string',
      title: 'Region'
    },
    operationalGroup: {
      type: 'string',
      title: 'Operational Group/Brand'
    },
    businessUnit: {
      type: 'string',
      title: 'Business Unit'
    },
    team: {
      type: 'string',
      title: 'Team'
    },
  }
};

export default schema;
