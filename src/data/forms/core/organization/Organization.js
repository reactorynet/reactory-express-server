import {
  StringProperty,
  DateProperty,
} from '../../defs';

export default {
  type: 'object',
  title: 'Organization Form', // eslint-disable-line
  description: 'Edit an organization basic data',
  properties: {
    name: StringProperty('Name', 'Company name', 5, 100),
    code: StringProperty('Code', 'Internal Company Reference Code', 0, 50),
    logo: StringProperty('Logo', 'Logo File'),
    logoURL: StringProperty('Logo', 'Logo URL'),
  },
};
