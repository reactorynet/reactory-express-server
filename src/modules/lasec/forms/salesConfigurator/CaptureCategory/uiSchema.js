export default {
  submitIcon: 'refresh',
  'ui:options': {
    isContainer: true,
    passProperties: ['$route']
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      categoryDetail: { md: 12, sm: 12, xs: 12 },
    },
  ],
  categoryDetail: {
    'ui:widget': 'LasecCategoryDetail',
    'ui:options': {
      skipOnChange: false
    },
  },
}
