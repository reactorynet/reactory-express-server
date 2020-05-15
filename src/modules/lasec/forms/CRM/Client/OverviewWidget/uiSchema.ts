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
      clientStatus: { xs: 3, sm: 1, md: 1 },
      fullName: { xs: 9, sm: 6, md: 3, lg: 2 },
      customerStatus: { xs: 3, sm: 1, md: 1, lg: 1 },
      accountNumber: { xs: 6, sm: 4, md: 3, lg: 2 },
      accountType: { xs: 6, sm: 4, md: 3, lg: 2 },
      customer: { xs: 6, sm: 4, md: 3, lg: 2 },
      availableBalance: { xs: 6, sm: 2, md: 2, lg: 1 },
      creditLimit: { xs: 6, sm: 2, md: 2, lg: 1},
    }
  ],
  clientStatus: {
    'ui:options': {
      componentFqn: 'core.ConditionalIconComponent@1.0.0',
      componentProps: {
        label: 'Client Status',
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
        'formData': 'value',
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
            icon: 'trip_origin',
            style: {
              color: '#5EB848'
            },
            tooltip: 'Not on hold'
          },
          {
            key: 'on-hold',
            icon: 'trip_origin',
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
        'formData': 'value',
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
