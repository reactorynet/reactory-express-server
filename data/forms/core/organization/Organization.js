import {
  StringProperty,
  DateProperty,
} from '../../defs';

export default {
  type: 'object',
  title: 'Organization Form', // eslint-disable-line
  description: 'Edit an organization basic data',
  properties: {
    id: {
      type: 'string',
      title: 'Organization Id',
      description: 'System Assigned Id',
    },
    name: StringProperty('Name', 'Company name', 5, 100),
    code: StringProperty('Code', 'Internal Company Reference Code', 0, 50),
    logo: StringProperty('Logo', 'Company Logo'),
    avatar: StringProperty('Avatar', 'Avatar for lookup and small presentation'),
    createdAt: DateProperty('Created At', 'The date the organization was created'),
    updatedAt: DateProperty('Updated At', 'The date the organization was updated'),
  },
};
