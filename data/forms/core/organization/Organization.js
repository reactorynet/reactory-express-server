import {
  StringProperty,
  DateProperty,
} from '../../defs';

export default {
  type: 'object',
  title: '${name}', // eslint-disable-line
  description: 'Manage the organization schema',
  properties: {
    id: {
      type: 'string',
      title: 'Organization Id',
      description: 'System Assigned Id',
    },
    name: StringProperty('Name', 'Company name', 5, 100),
    logo: StringProperty('Logo', 'Company Logo'),
    avatar: StringProperty('Avatar', 'Avatar for lookup and small presentation'),
    createdBy: StringProperty('Created By', 'User that created the organization'),
    updatedBy: StringProperty('Updated By', 'The user that updated the organization'),
    createdAt: DateProperty('Created At', 'The date the organization was created'),
    updatedAt: DateProperty('Updated At', 'The date the organization was updated'),
  },
};
