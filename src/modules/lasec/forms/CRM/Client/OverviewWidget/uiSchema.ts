import { Reactory } from "@reactory/server-core/types/reactory";

let uiSchema : any = {
  'ui:options': {
    toolbarPosition: 'none',
    showSubmit: false,
    showRefresh: false,
    showBack: true,
    componentType: "div",
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      clientStatus: { md: 1 },
      fullName: { md: 3 },
      customerStatus: { md: 1 },
      accountNumber: { md: 1 },
      accountType: { md: 1 },
      customer: {md: 3 },
      availableBalance: { md: 1 },
      creditLimit: { md: 1},
    }
  ],  
  clientStatus: { 
    'ui:options': {
      componentFqn: 'core.ConditionalIconComponent@1.0.0',
      componentProps: {        
        conditions: [
          {
            key: 'active',
            icon: 'trip_origin',
            style: {
              color: '#5EB848'                  
            },
            tooltip: 'Client Active'
          },
          {
            key: 'unfinished',
            icon: 'trip_origin',
            style: {
              color: '#FF9901'
            },
            tooltip: 'Client Unfinished'
          },
          {
            key: 'deactivated',
            icon: 'trip_origin',
            style: {
              color: '#AB1257'
            },
            tooltip: 'Client Deactivated'
          }                  
        ]
      },
      style: {
        marginRight: '8px',
        marginTop: '8px',
      },
      propsMap: {
        'formContext.formData.clientStatus': 'value',
      },
    }       
  },
  fullName: {
    readOnly: true,
    'ui:options': {
      readOnly: true
    }
  },
  customerStatus: {
    'ui:options': {
      componentFqn: 'core.ConditionalIconComponent@1.0.0',
      componentProps: {        
        conditions: [
          {
            key: 'not-on-hold',
            icon: 'fiber_manual_record',
            style: {
              color: '#5EB848'                  
            },
            tooltip: 'Not on hold'
          },
          {
            key: 'on-hold',
            icon: 'fiber_manual_record',
            style: {
              color: '#FF9901'
            },
            tooltip: 'Customer is on hold'
          },          
        ]
      },
      style: {
        marginRight: '8px',
        marginTop: '8px',
      },
      propsMap: {
        'formContext.formData.customerStatus': 'value',
      },
    }, 
  },
  accountNumber: {
    'ui:options': {
      readOnly: true
    }
  },
  accountType: {

  },
  customer: {
    'ui:options': {
      readOnly: true
    }
  }, 
  availableBalance: {
    'ui:widget': 'StyledCurrencyLabel',
    'ui:options': {
      prependText: '',
      label:"Available Balance"
    },
  },
  creditLimit: {
    'ui:widget': 'StyledCurrencyLabel',
    'ui:options': {
      prependText: '',
      label:"Credit Limit"
    },
  }
};

export default uiSchema;