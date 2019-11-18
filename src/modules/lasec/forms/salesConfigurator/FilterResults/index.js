import $schema from './schema';
import $uiSchema from './uiSchema';
// import $graphql from './graphql';

export default {
  id: 'FilterResults',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales Configurator Filter Results',
  tags: ['CRM Salesconfigurator Filter Results'],
  registerAsComponent: true,
  name: 'FilterResults',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  defaultFormValue: {
    filterResultList: [
      {
        header: {
          cardTitle: 'Title From Form Data',
          cardSubHeader: 'Title From Subheader Form Data',
          avatar: 'https://www.codewars.com/assets/logos/logo-square-red-big-c74ae0e7a89b33acd3beb1f08229630391934650e3bbd30ddc40e8be5bbfc71e.png'
        },
        content: 'Assertively reinvent highly efficient methodologies whereas interactive ideas. Uniquely conceptualize long-term high-impact.',
        actions: []
      },
      {
        header: {
          cardTitle: 'Title From Form Data',
          cardSubHeader: 'Title From Subheader Form Data',
          avatar: 'https://www.codewars.com/assets/logos/logo-square-red-big-c74ae0e7a89b33acd3beb1f08229630391934650e3bbd30ddc40e8be5bbfc71e.png'
        },
        content: 'Assertively reinvent highly efficient methodologies whereas interactive ideas. Uniquely conceptualize long-term high-impact.',
        actions: []
      }
    ],
    testCard: {
      header: {
        cardTitle: 'Title From Form Data',
        cardSubHeader: 'Title From Subheader Form Data',
        avatar: 'https://www.codewars.com/assets/logos/logo-square-red-big-c74ae0e7a89b33acd3beb1f08229630391934650e3bbd30ddc40e8be5bbfc71e.png'
      },
      content: 'Assertively reinvent highly efficient methodologies whereas interactive ideas. Uniquely conceptualize long-term high-impact.',
      actions: []
    }
  },
};
