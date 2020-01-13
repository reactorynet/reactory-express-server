import { Reactory } from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  title: 'Copy Leadership Brand',
  description: 'Use this form to copy a leadership brand from one organization to another',
  type: 'object',
  properties: {    
    SourceLeadershipBrand: {
      type: 'string',
      title: 'Source Leadership Brand',
      description: 'Select the source leadership brand',
    },
    TargetOrganization: {
      type: 'string',
      title: 'Target Organization',
    },
    TargetTitle: {
      type: 'string',
      title: 'Target Title',
    },
  }
};

export default schema;