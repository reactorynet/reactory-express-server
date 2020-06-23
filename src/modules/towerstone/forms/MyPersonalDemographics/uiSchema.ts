const uiSchema: any = {
  // submitIcon: 'refresh',
  'ui:options': {
    // toolbarPosition: 'none',
    showRefresh: false,
    showSubmit: true,
    componentType: "form",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
      marginRight: '16px',
      marginLeft: '16px',
    },
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      id: { xs: 12 },
    },
    {
      age: { xs: 12, sm: 6, md: 4 },
      gender: { xs: 12, sm: 6, md: 4 },
      race: { xs: 12, sm: 6, md: 4 },            
    },
    {
      position: { xs: 12, sm: 6, md: 4 },
      region: { xs: 12, sm: 6, md: 4 },
      operationalGroup: { xs: 12, sm: 6 },
      businessUnit: { xs: 12, sm: 6 },
      team: { xs: 12, sm: 6 },
    }
  ],
  id: {
    'ui:widget': 'HiddenWidget',    
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
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'getDemographicLookup',
      resultsMap: {
        'getDemographicLookup.[].id': ['[].key', '[].value'],
        'getDemographicLookup.[].name': '[].label',
      },
    },
  },
  age: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query TowerStoneGetDemographicLookup {
        TowerStoneGetDemographicLookup(lookupType: "age") {
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
      //propertyMap: {
      // 'formContext.$formData.organisationId': 'orgId'
      //},
      resultItem: 'TowerStoneGetDemographicLookup',
      resultsMap: {
        'getDemographicLookup.[].id': ['[].key', '[].value'],
        'getDemographicLookup.[].name': '[].label',
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
        'getDemographicLookup.[].id': ['[].key', '[].value'],
        'getDemographicLookup.[].name': '[].label',
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
