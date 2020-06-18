const uiSchema: any = {
  // submitIcon: 'refresh',
  'ui:options': {
    toolbarPosition: 'none',
    showRefresh: false,
    showSubmit: true,
    componentType: "div",
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      id: { xs: 12 },
    },
    {
      race: { xs: 12 },
    },
  ],
  id: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecClientOverviewWidget@1.0.0',
      componentPropsMap: {
        'formContext.$formData.id': 'formData.id',
      }
    }
  },
  race: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query getDemographicLookup {
        getDemographicLookup(lookupType: "race") {
          id
          name
        }
      }`,
      propertyMap: {
        // 'formContext.$formData.organisationId': 'orgId'
      },
      resultItem: 'getDemographicLookup',
      resultsMap: {
        'getDemographicLookup.[].id': ['[].key', '[].value'],
        'getDemographicLookup.[].name': '[].label',
      },
    },
  },
};

export default uiSchema;
