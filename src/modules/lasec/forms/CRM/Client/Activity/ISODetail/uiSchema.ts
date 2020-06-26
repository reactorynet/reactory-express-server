
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    },
    style: {
      marginTop: '16px',
      marginRight: '16px',
      marginLeft: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      orderDate: { xs: 12, sm: 6 },
      customer: { xs: 12, sm: 6 },
      client: { xs: 12, sm: 6 },
      orderStatus: { xs: 12, sm: 6 },
      currency: { xs: 12, sm: 6 },
      orderId: { xs: 12, sm: 6 },
      poNumber: { xs: 12, sm: 6 },
      quoteId: { xs: 12, sm: 6 },
      orderType: { xs: 12, sm: 6 },
      salesTeam: { xs: 12, sm: 6 },
      deliveryAddress: { xs: 12 },
      warehouseNote: { xs: 12 },
      deliveryNote: { xs: 12 },
    },
    {
      documentIds: { xs: 12 },
    },
    {
      lineItems: { xs: 12 },
    },
  ],

  orderDate: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${api.utils.moment(formData).format("DD MMM YYYY")}',
      variant: 'subtitle1',
      title: 'Order Date',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
          fontSize: '1rem'
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  customer: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Customer',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  client: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  orderStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Order Status',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  currency: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Currency',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  orderId: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Sales Order #',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  poNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Purhase Order #',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  quoteId: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Quote #',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  orderType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Order Type',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  salesPerson: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData != "" ? formData : "N/A"}',
      variant: 'subtitle1',
      title: 'Sales Person',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  deliveryAddress: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData != "" ? formData : "N/A"}',
      variant: 'subtitle1',
      title: 'Delivery Address',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  warehouseNote: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData != "" ? formData : "N/A"}',
      variant: 'subtitle1',
      title: 'Warehouse Note',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  deliveryNote: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData != "" ? formData : "N/A"}',
      variant: 'subtitle1',
      title: 'Delivery Note',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  salesTeam: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData != "" ? formData : "N/A"}',
      variant: 'subtitle1',
      title: 'Sales Team',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  documentIds: {
    'ui:widget': 'DocumentListWidget',
    'ui:options': {
      label: 'Sales Order Documents',
      query: `query LasecGetSaleOrderDocument($ids: [String]) {
        LasecGetSaleOrderDocument(ids: $ids) {
          id
          name
          url
        }
      }`,
      mutation: `mutation LasecDeleteSaleOrderDocument($id: String) {
        LasecDeleteSaleOrderDocument(id: $id) {
          success
          message
        }
      }`,
      propertyMap: {
        'formContext.$formData.documentIds': 'ids'
      },
      resultItem: 'LasecGetSaleOrderDocument',
      resultsMap: {
        'LasecGetSaleOrderDocument.[].id': '[].id',
        'LasecGetSaleOrderDocument.[].name': '[].name',
        'LasecGetSaleOrderDocument.[].url': '[].url',
      },
    },
  },

  lineItems: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Stock Code', field: 'productCode' },
        { title: 'Product Description', field: 'productDescription' },
        { title: 'Unit of Measure', field: 'unitOfMeasure' },
        {
          title: 'Unit Price',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.price': 'value',
          },
        },
        {
          title: 'Total Price',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.totalPrice': 'value',
          },
        },
        { title: 'Order Qty', field: 'orderQty' },
        { title: 'Shipped Qty', field: 'shippedQty' },
        { title: 'Back Order', field: 'backOrderQty' },
        { title: 'Comment', field: 'comment' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: false,
    }
  }


};

export default uiSchema;
