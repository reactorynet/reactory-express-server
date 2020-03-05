import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
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
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit'
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      customerStatus: { sm: 12, md: 12, lg: 12 },
      registeredCompanyName: { sm: 12, md: 12, lg: 12 },
      tradingName: { sm: 12, md: 12, lg: 12 },
      tradingCurrency: { sm: 12, md: 12, lg: 12 },
      description: { sm: 12, md: 12, lg: 12 },
      physicalAddress: { sm: 12, md: 12, lg: 12 },
      deliveryAddress: { sm: 12, md: 12, lg: 12 },
      billingAddress: { sm: 12, md: 12, lg: 12 },
      registrationNumber: { sm: 12, md: 12, lg: 12 },
      taxNumber: { sm: 12, md: 12, lg: 12 }
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
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
      ...labelProps
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
  physicalAddress: { 
    'ui:widget': 'LabelWidget',
    'ui:options': {      
      title: 'Physical Address',
      ...labelProps
    }  
  },
  deliveryAddress: { 
    'ui:widget': 'LabelWidget',
    'ui:options': {      
      title: 'Delivery Address',
      ...labelProps
    }
  },
  billingAddress: { 
    'ui:widget': 'LabelWidget',
    'ui:options': {      
      title: 'Billing Address',
      ...labelProps
    }
  },
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
    // toolbarPosition: 'none', // needs the toolbar to save
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      buttonVariant: "contained",
      selectSchemaId: 'display'
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      customerStatus: { sm: 12, md: 12, lg: 12 },
      registeredCompanyName: { sm: 12, md: 12, lg: 12 },
      tradingName: { sm: 12, md: 12, lg: 12 },
      tradingCurrency: { sm: 12, md: 12, lg: 12 },
      description: { sm: 12, md: 12, lg: 12 },
      physicalAddress: { sm: 12, md: 12, lg: 12 },
      deliveryAddress: { sm: 12, md: 12, lg: 12 },
      registrationNumber: { sm: 12, md: 12, lg: 12 },
      taxNumber: { sm: 12, md: 12, lg: 12 }
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  customerStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Customer Status',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  },

  registeredCompanyName: {
    //'ui:widget': 'LabelWidget',
    'ui:options': {
      /**
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Registered Company Name',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
       */
      variant: 'outlined'
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
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  },
  tradingCurrency: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Trading Currency',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  },
  description: { 
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Description',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    } 
  },
  physicalAddress: { 
    //'ui:widget': 'LabelWidget',
    'ui:options': {
      /*
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Physical Address',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
      */
     variant: 'outlined'
    }  
  },
  deliveryAddress: { 
    //'ui:widget': 'LabelWidget',
    'ui:options': {
      /*
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Delivery Address',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
      */
     variant: "outlined"
    }
  },
  registrationNumber: { 
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Registration Number',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  },
  taxNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Tax Number',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "CUSTOMER DETAILS",
  properties: {
    customerStatus: {
      type: 'string',
      title: 'Customer Status'
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
};

export default LasecCRMCustomerDetails;
