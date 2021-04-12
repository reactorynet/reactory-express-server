const uiSchema: any = {
  // submitIcon: 'refresh',
  'ui:options': {
    // toolbarPosition: 'none',
    showRefresh: false,
    showSubmit: true,
    componentType: "form",
    submitProps: {
      variant: 'contained',
      color: 'primary',
      text: 'SAVE CHANGES',
      iconAlign: 'none',
    },
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px',
    },
    style: {
      marginTop: '16px',
      marginRight: '16px',
      marginLeft: '16px',
    },
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 2,
    container: 'div',
  },
  'ui:grid-layout': [
    {
      age: { xs: 12, sm: 6, md: 6 },
      gender: { xs: 12, sm: 6, md: 6 },
      race: { xs: 12, sm: 6, md: 6 },
      position: { xs: 12, sm: 6, md: 6 },
      region: { xs: 12, sm: 6, md: 6 },
      operationalGroup: { xs: 12, sm: 6 },
      businessUnit: { xs: 12, sm: 6 },
      team: { xs: 12, sm: 6 },
    },
  ],
  race: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "race") {
          id
          name
        }
      }`,
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  age: {
    'ui:widget': 'DateSelectorWidget',
  },
  gender: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "gender") {
          id
          name
        }
      }`,
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  pronoun: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "pronoun") {
          id
          name
        }
      }`,
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  position: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "position") {
          id
          name
        }
      }`,
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  region: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "region") {
          id
          name
        }
      }`,
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  operationalGroup: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "operational_group") {
          id
          name
        }
      }`,
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  businessUnit: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "business_unit") {
          id
          name
        }
      }`,
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
  team: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "team") {
          id
          name
        }
      }`,
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'TowerStoneGetDemographicLookup.[].id': ['[].key', '[].value'],
        'TowerStoneGetDemographicLookup.[].name': '[].label',
      },
    },
  },
};

export default uiSchema;
