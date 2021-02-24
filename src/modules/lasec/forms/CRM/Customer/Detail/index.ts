import { Reactory } from '@reactory/server-core/types/reactory'
import graphql from './graphql';

const labelProps = {
  readOnly: true,
  format: '${formData}',
  variant: 'subtitle1',
  titleProps: {
    style: {
      display: 'content',
      minWidth: '220px',
      color: "#9A9A9A",
    }
  },
  bodyProps: {
    style: {
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }
};

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '24px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit',
      buttonVariant: 'outlined',
      style: {
        top: '10px'
      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      }
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: true,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px',
    }
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      customerStatus: { md: 3, sm: 12 },
      registeredCompanyName: { md: 3, sm: 12 },
    }, {
      tradingName: { md: 3, sm: 12 },
      tradingCurrency: { md: 3, sm: 12 },
    }, {
      description: { md: 3, sm: 12 },
      // physicalAddress: { md: 6, sm: 12 },
      // deliveryAddress: { md: 6, sm: 12 },
      // billingAddress: { md: 6, sm: 12 },
      registrationNumber: { md: 3, sm: 12 },
    }, {
      taxNumber: { md: 3, sm: 12 },
    },
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      showLabel: false,
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  customerStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      title: 'Customer Status',
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '220px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      },
      icon: 'fiber_manual_record',
      iconPosition: 'inline',
      iconProps: {
        style: {
          color: '#FF9901',
          margingRight: '4px'
        },

      },
      $iconProps: 'lasec-crm.CustomerStatusIconFormatFunction@1.0.0',

    }
  },
  registeredCompanyName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      title: 'Registered Company Name',
      ...labelProps
    }
  },
  tradingName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      component: "TextField",
      componentProps: {
        variant: "outlined"
      },
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Trading Name',
      ...labelProps
    }
  },
  tradingCurrency: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      title: 'Trading Currency',
      ...labelProps
    }
  },
  description: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      title: 'Description',
      ...labelProps
    }
  },
  // ADDRESS GOES IN THE ADDRESS FORM
  // physicalAddress: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     title: 'Physical Address',
  //     ...labelProps
  //   }
  // },
  // deliveryAddress: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     title: 'Delivery Address',
  //     ...labelProps
  //   }
  // },
  // billingAddress: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     title: 'Billing Address',
  //     ...labelProps
  //   }
  // },
  registrationNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      title: 'Registration Number',
      ...labelProps
    }
  },
  taxNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      title: 'Tax Number',
      ...labelProps
    }
  }
};

const editUiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      selectSchemaId: 'display',
      buttonVariant: 'outlined',
      style: {
        top: 0
      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      },
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '10px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px 24px'
    }
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      registeredCompanyName: { md: 6, sm: 12 },
      style: { padding: '25px 32px 0 32px' }
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      showLabel: false,
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  registeredCompanyName: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer',
      modalProps: {
        fullScreen: false,
        closeOnEvents: [
          'CloseModal:LasecCRMCustomerCompanyLookupTable'
        ]
      }
    },
    props: {
      refreshOnChange: false,
      handleOnChange: true,
      eventMaps: {
        onChange: {
          'evt.selected.registeredName': 'formData?'
        },
      },
      componentFqn: 'lasec-crm.LasecCRMCustomerCompanyLookupTable@1.0.0',
      componentProps: {},
      componentPropertyMap: {
        'LookupComponent.props.formContext.$formData': 'formData.selected',
        'LookupComponent.props.onChange': 'onCustomerSelect',
        'LookupComponent.props.formContext': 'LookupComponentFormContext',
        'LookupComponent.props.formData': 'formData.selected.registeredName'
      },
    },
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "CUSTOMER DETAILS",
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    customerStatus: {
      type: 'string',
      title: 'Customer Status'
    },
    customer: {
      type: 'string',
      title: 'Customer'
    },
    registeredCompanyName: {
      type: 'string',
      title: 'Registered Company Name'
    },
    tradingName: {
      type: 'string',
      title: 'Trading Name'
    },
    tradingCurrency: {
      type: 'string',
      title: 'Trading Currency'
    },
    description: {
      type: 'string',
      title: 'Description'
    },
    physicalAddress: {
      type: 'string',
      title: 'Physical Address'
    },
    deliveryAddress: {
      type: 'string',
      title: 'Delivery Address'
    },
    billingAddress: {
      type: 'string',
      title: 'Billing Address'
    },
    registrationNumber: {
      type: 'string',
      title: 'Registration Number'
    },
    taxNumber: {
      type: 'string',
      title: 'Tax Number'
    }
  }
};

const LasecCRMCustomerDetails: Reactory.IReactoryForm = {
  id: 'LasecCRMCustomerDetails',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMCustomerDetails',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql,
  uiSchema: displayUiSchema,
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Customer Details',
      icon: 'list',
      uiSchema: displayUiSchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Edit Customer Details',
      icon: 'view_module',
      uiSchema: editUiSchema,
    },
  ],
  defaultFormValue: {

  },
  defaultUiSchemaKey: 'display',
  widgetMap: [
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMCustomerDetails;
