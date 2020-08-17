import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from '../shared/graphql';
import $schema from '../shared/schema';

const uiSchemaTable: any = {
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
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { view: { sm: 12, md: 12, lg: 12 } },
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0 } }
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
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '', field: 'onSyspro',
          width: '40px',
          component: 'core.ConditionalIconComponent@1.0.0',
          props: {
            'ui:options': {},
            conditions: [
              {
                key: 'on_syspro',
                icon: 'error',
                style: {
                  color: '#9AD86E'
                },
                tooltip: 'ON SYSPRO'
              },
              {
                key: 'not_on_syspro',
                icon: 'error',
                style: {
                  color: '#D22D2C'
                },
                tooltip: 'NOT ON SYSPRO'
              },
              {
                key: 'on_hold',
                icon: 'error',
                style: {
                  color: '#D22D2C'
                },
                tooltip: 'ON HOLD'
              },
              {
                key: 'on_partial_hold',
                icon: 'error',
                style: {
                  color: '#f7b425'
                },
                tooltip: 'ON PARTIAL HOLD'
              },
            ]
          },
          propsMap: {
            'rowData.onSyspro': 'value',
          },

        },
        {
          title: '', field: 'image',
          width: '80px',
          component: 'core.ImageComponent@1.0.0',
          props: {
            'ui:options': {
              variant: 'rounded'
            },
          },
          propsMap: {
            'rowData.image': 'value',
          },
        },
        {
          title: 'Stock Code',
          field: 'code',
          components: [
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.LasecProductDetails@1.0.0',
                componentProps: {
                  'rowData': 'formData',                  
                },
                slideDirection: 'left',
                buttonVariant: 'button',
                buttonProps: {                  
                  size: 'small',                  
                },
                buttonIcon: 'launch',
                windowTitle: '${rowData.code} ${rowData.name}',
              },
            },
            {
              component: 'core.LabelComponent@1.0.0',
              props: {
                uiSchema: {
                  'ui:options': {
                    variant: 'p',
                    copyToClipboard: true,
                    format: '${rowData.code}',                   
                    bodyProps: {
                                            
                    }
                  }
                },
              },
              propsMap: {
                'rowData.code': 'value',
              }
            },           
          ],          
        },
        { title: 'Description', field: 'name' },
        {
          title: 'Unit of Measure',
          field: 'unitOfMeasure',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'square_foot',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.unitOfMeasure}'
              }
            },
          },
        },
        { title: 'Supplier', field: 'supplier' },
        { title: 'Model', field: 'model' },
        { title: 'Shipment Size', field: 'shipmentSize' },
        {
          title: 'ExWorks Factor', field: 'exWorksFactor',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            region: 'en-US',
            currency: 'USD'
          },
          propsMap: {
            'rowData.exWorksFactor': 'value',
          },
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.product': 'product'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'products.[].id': 'data.[].id',
        'products.[].name': 'data.[].name',
        'products.[].code': 'data.[].code',
        'products.[].description': 'data.[].description',
        'products.[].qtyAvailable': 'data.[].qtyAvailable',
        'products.[].qtyOnHand': 'data.[].qtyOnHand',
        'products.[].qtyOnOrder': 'data.[].qtyOnOrder',
        'products.[].unitOfMeasure': 'data.[].unitOfMeasure',
        'products.[].price': 'data.[].price',
        'products.[].image': 'data.[].image',
        'products.[].onSyspro': 'data.[].onSyspro',
        'products.[].priceAdditionalInfo': 'data.[].priceAdditionalInfo',
        'products.[].landedPrice': 'data.[].landedPrice',
        'products.[].wh10CostPrice': 'data.[].wh10CostPrice',
        'products.[].threeMonthAvePrice': 'data.[].threeMonthAvePrice',
        'products.[].listPrice': 'data.[].listPrice',
        'products.[].buyer': 'data.[].buyer',
        'products.[].planner': 'data.[].planner',
        'products.[].isHazardous': 'data.[].isHazardous',
        'products.[].siteEvaluationRequired': 'data.[].siteEvaluationRequired',
        'products.[].packedLength': 'data.[].packedLength',
        'products.[].packedWidth': 'data.[].packedWidth',
        'products.[].packedHeight': 'data.[].packedHeight',
        'products.[].packedVolume': 'data.[].packedVolume',
        'products.[].packedWeight': 'data.[].packedWeight',
        'products.[].numberOfSalesOrders': 'data.[].numberOfSalesOrders',
        'products.[].numberOfPurchaseOrders': 'data.[].numberOfPurchaseOrders',
        'products.[].supplier': 'data.[].supplier',
        'products.[].model': 'data.[].model',
        'products.[].shipmentSize': 'data.[].shipmentSize',
        'products.[].exWorksFactor': 'data.[].exWorksFactor',
      },
    },
  }
};

const uiSchemaGrid: any = {
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
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { view: { xs: 12, sm: 12, md: 12, lg: 12 } },
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0 } }
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
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'GridLayoutWidget',
    'ui:options': {
      component: 'lasec.ProductCardComponent@1.0.0',
      componentProps: {
        cardContent: {
          fields: [
            {
              label: 'Supplier:',
              value: 'supplier',
              unit: '',
              icon: ''
            },
            {
              label: 'Model:',
              value: 'model',
              unit: '',
              icon: ''
            },
            {
              label: 'Shipment Size:',
              value: 'shipmentSize',
              unit: '',
              icon: ''
            },
            {
              label: 'ExWorks Factor:',
              value: 'exWorksFactor',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: 'Freight Factor:',
              value: 'freightFactor',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: 'Clearing Factor:',
              value: 'clearingFactor',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Actual Cost WH10:',
              value: 'actualCostwh10',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Actual Cost WH20:',
              value: 'actualCostwh20',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Actual Cost WH21:',
              value: 'actualCostwh21',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Actual Cost WH31:',
              value: 'actualCostwh31',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Supplier Unit Price:',
              value: 'supplierUnitPrice',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: '% Discount:',
              value: 'percDiscount',
              unit: '',
              icon: ''
            },
            {
              label: 'Discounted Price:',
              value: 'discountPrice',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: 'Freight Price:',
              value: 'freightPrice',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: 'Exworks Price:',
              value: 'exWorksPrice',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: 'Crafting FOC:',
              value: 'craftingFOC',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: 'NET FOB:',
              value: 'netFOB',
              unit: '',
              isCents: true,
              region: 'en-US',
              currency: 'USD',
              icon: ''
            },
            {
              label: '% Duty:',
              value: 'percDuty',
              unit: '',
              icon: ''
            },
            {
              label: 'Clearance:',
              value: 'clearance',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Landed Cost:',
              value: 'landedCost',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
            {
              label: 'Markup:',
              value: 'markup',
              unit: '%',
              icon: ''
            },
            {
              label: 'Selling Price:',
              value: 'sellingPrice',
              unit: '',
              isCents: true,
              region: 'en-ZA',
              currency: 'ZAR',
              icon: ''
            },
          ],
          hasPricingChart: false
        },
      },
      loadingMessage: 'Loading product costings, please wait a moment',
      remoteData: true,
      variables: {
        'props.formContext.$formData.product': 'product',
        'props.formContext.$formData.paging': 'paging'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'products.[].id': 'data.[].id',
        'products.[].name': 'data.[].name',
        'products.[].code': 'data.[].code',
        'products.[].description': 'data.[].description',
        'products.[].qtyAvailable': 'data.[].qtyAvailable',
        'products.[].qtyOnHand': 'data.[].qtyOnHand',
        'products.[].qtyOnOrder': 'data.[].qtyOnOrder',
        'products.[].unitOfMeasure': 'data.[].unitOfMeasure',
        'products.[].price': 'data.[].price',
        'products.[].image': 'data.[].image',
        'products.[].onSyspro': 'data.[].onSyspro',
        'products.[].priceAdditionalInfo': 'data.[].priceAdditionalInfo',
        'products.[].landedPrice': 'data.[].landedPrice',
        'products.[].wh10CostPrice': 'data.[].wh10CostPrice',
        'products.[].threeMonthAvePrice': 'data.[].threeMonthAvePrice',
        'products.[].listPrice': 'data.[].listPrice',
        'products.[].buyer': 'data.[].buyer',
        'products.[].planner': 'data.[].planner',
        'products.[].isHazardous': 'data.[].isHazardous',
        'products.[].siteEvaluationRequired': 'data.[].siteEvaluationRequired',
        'products.[].packedLength': 'data.[].packedLength',
        'products.[].packedWidth': 'data.[].packedWidth',
        'products.[].packedHeight': 'data.[].packedHeight',
        'products.[].packedVolume': 'data.[].packedVolume',
        'products.[].packedWeight': 'data.[].packedWeight',
        'products.[].numberOfSalesOrders': 'data.[].numberOfSalesOrders',
        'products.[].numberOfPurchaseOrders': 'data.[].numberOfPurchaseOrders',
        'products.[].supplier': 'data.[].supplier',
        'products.[].model': 'data.[].model',
        'products.[].shipmentSize': 'data.[].shipmentSize',
        'products.[].exWorksFactor': 'data.[].exWorksFactor',
        'products.[].productClass': 'data.[].productClass',
        'products.[].tariffCode': 'data.[].tariffCode',
        'products.[].leadTime': 'data.[].leadTime',
        'products.[].validPriceUntil': 'data.[].validPriceUntil',
        'products.[].lastUpdated': 'data.[].lastUpdated',
        'products.[].lastUpdatedBy': 'data.[].lastUpdatedBy',
        'products.[].lastOrdered': 'data.[].lastOrdered',
        'products.[].lastReceived': 'data.[].lastReceived',
        'products.[].supplyCurrency': 'data.[].supplyCurrency',
        'products.[].listCurrency': 'data.[].listCurrency',

        'products.[].freightFactor': 'data.[].freightFactor',
        'products.[].clearingFactor': 'data.[].clearingFactor',
        'products.[].actualCostwh10': 'data.[].actualCostwh10',
        'products.[].actualCostwh20': 'data.[].actualCostwh20',
        'products.[].actualCostwh21': 'data.[].actualCostwh21',
        'products.[].actualCostwh31': 'data.[].actualCostwh31',
        'products.[].supplierUnitPrice': 'data.[].supplierUnitPrice',
        'products.[].percDiscount': 'data.[].percDiscount',
        'products.[].discountPrice': 'data.[].discountPrice',
        'products.[].freightPrice': 'data.[].freightPrice',
        'products.[].exWorksPrice': 'data.[].exWorksPrice',
        'products.[].craftingFOC': 'data.[].craftingFOC',
        'products.[].netFOB': 'data.[].netFOB',
        'products.[].percDuty': 'data.[].percDuty',
        'products.[].clearance': 'data.[].clearance',
        'products.[].landedCost': 'data.[].landedCost',
        'products.[].markup': 'data.[].markup',
        'products.[].sellingPrice': 'data.[].sellingPrice',

      },
    },
  }
};

const LasecProductCostings: Reactory.IReactoryForm = {
  id: 'LasecProductCostings',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Costings',
  tags: ['CMS Product Costings'],
  registerAsComponent: true,
  name: 'LasecProductCostings',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: uiSchemaTable,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    product: "",
    products: []
  },
  uiSchemas: [
    {
      id: 'default',
      title: 'TABLE',
      key: 'default',
      description: 'Product Details Table',
      icon: 'list',
      uiSchema: uiSchemaTable,
    },
    {
      id: 'grid',
      title: 'GRID',
      key: 'grid',
      description: 'Product Details Grid',
      icon: 'view_module',
      uiSchema: uiSchemaGrid,
    }
  ],
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.GridLayoutComponent@1.0.0', widget: 'GridLayoutWidget' }
  ],
};

export default LasecProductCostings;
