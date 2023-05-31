import schema from './schema';
import DefaultUiSchema from './uiSchema';
import $graphql from './graphql';

const AboutUs = {
  // id - this should be a unique id for all components / forms
  id: 'AboutUs',
  /**
   * uiFramework - material / bootstrap
   */
  uiFramework: 'material',
  // which uiFrameworks you support with this form
  uiSupport: ['material'],
  // additional resources to be loaded, css, js etc.
  uiResources: [],
  // a form title
  title: 'About Reactory',
  // tags for searching / indexing
  tags: ['About Us', 'forms'],
  // name part of the fqn
  name: 'AboutUs',
  // nameSpace.name.version
  nameSpace: 'static',
  // nameSpace.name.version
  version: '1.0.0',
  // a short description
  description: 'A form that represent an about us page',
  // author
  author: {
    fullName: 'Werner Weber',
    email: 'werner.weber@gmail.com',
  },
  // help topics to enable help button
  helpTopics: [
    'About',
  ],
  // registers the component in the api.componentRegistry
  registerAsComponent: true,
  // the data schema that represent the data struct
  schema,
  
  uiSchema: DefaultUiSchema,
  defaultFormValue: {
    slug: 'about us'
  },
  graphql: $graphql
};

export default AboutUs;
