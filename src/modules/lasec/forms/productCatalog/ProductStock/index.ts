import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from '../shared/graphql';
import $schema from '../shared/schema';

  const uiSchema: any = {
    'ui:options': {
      componentType: "div",
      containerStyles: {
        padding: '0px',
        margin: '0px',
        paddingBottom: '8px'
      },
      showSubmit: false,
      showRefresh: false,
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
          { title: 'Stock Code', field: 'code' },
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
          {
            title: 'Stock',
            field: 'id',
            width: '',
            cellStyle: {
              margin: 0,
              padding: 0
            },
            component: 'lasec-crm.LasecProductQuantityTable@1.0.0',
            props: {},
            propsMap: {
              'rowData.id': 'formData.id',
            },
            //component: {
            //
            //},
            /*
            component: 'core.TableChildComponentWrapper@1.0.0',
            props: {

            },
            propsMap: {
              'rowData': 'rowData',
              'formData': 'formData'
            },
            */
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
        },
      },
    }
  };

  const LasecProductStock: Reactory.IReactoryForm = {
    id: 'LasecProductStock',
    uiFramework: 'material',
    uiSupport: ['material'],
    uiResources: [],
    title: 'CMS Product Stock',
    tags: ['CMS Product Stock'],
    registerAsComponent: true,
    name: 'LasecProductStock',
    nameSpace: 'lasec-crm',
    version: '1.0.0',
    schema: $schema,
    graphql: $graphql,
    uiSchema,
    defaultFormValue: {
      paging: {
        page: 1,
        pageSize: 10,
      },
      product: "",
      products: []
    },
    widgetMap: [
      { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
      { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
      { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
      { componentFqn: 'core.GridLayoutComponent@1.0.0', widget: 'GridLayoutWidget' }
    ],
  };

  export default LasecProductStock;
