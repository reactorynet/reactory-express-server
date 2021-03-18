import { Reactory } from '@reactory/server-core/types/reactory'
// import $graphql from '../shared/graphql';
import $schema from '../shared/schema';

const $graphql = {
  queries: {
    products_table: {
      name: 'LasecGetProductList',
      autoQuery: false,
      text: `query LasecGetProductList($product: String!, $paging: PagingRequest){
        LasecGetProductList(product: $product, paging: $paging){
          paging {
            total
            page
            hasNext
            pageSize
          }
          product
          products {
            id
            meta
            name
            code
            description
            qtyAvailable
            qtyOnHand
            qtyOnOrder
            unitOfMeasure
            price
            priceIsExpired
            priceAdditionalInfo
            image
            onSyspro
            landedPrice
            wh10CostPrice
            threeMonthAvePrice
            listPrice
            buyer
            planner
            isHazardous
            siteEvaluationRequired
            packedLength
            packedWidth
            packedHeight
            packedVolume
            packedWeight

            numberOfSalesOrders
            numberOfPurchaseOrders

            supplier
            model
            shipmentSize
            exWorksFactor

            productClass
            tariffCode
            leadTime
            validPriceUntil
            lastUpdated
            lastUpdatedBy
            lastOrdered
            lastReceived
            supplyCurrency
            listCurrency

            freightFactor
            clearingFactor
            actualCostwh10
            actualCostwh20
            actualCostwh21
            actualCostwh31
            supplierUnitPrice
            percDiscount
            discountPrice
            freightPrice
            exWorksPrice
            craftingFOC
            netFOB
            percDuty
            percDuty
            clearance
            landedCost
            markup
            sellingPrice
          }
        }
      }`,
      resultMap: {
        'paging': 'paging',
        'product': 'product',
        'products': 'products',
      },
      resultType: 'object',
      edit: false,
      new: false,
      refreshEvents: [
        { name: 'lasec-crm::product-search' }
      ],
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    },
  },
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    },
    showSchemaSelectorInToolbar: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
  },
  'ui:grid-layout': [
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0, marginTop: '16px' } },
  ],
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '',
          field: 'onSyspro',
          components: [
            {
              title: '',
              field: 'onSyspro',
              component: 'lasec-crm.LasecProductAddToQuoteComponent@1.0.0',
              props: {},
              propsMap: {
                'rowData': 'product',
              },
            },
          ],
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          }
        },
        {
          title: 'Stock Code',
          field: 'code',
          width: '180px',
          cellStyle: {
            maxWidth: '180px',
            width: '180px'
          },
          headerStyles: {
            maxWidth: '180px',
            width: '180px'
          },
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
        {
          title: 'Description',
          field: 'name',
          width: '200px',
          cellStyle: {
            maxWidth: '200px',
            width: '200px'
          },
          headerStyles: {
            maxWidth: '200px',
            width: '200px'
          }
        },
        {
          title: 'Unit of Measure',
          field: 'unitOfMeasure',
          breakpoint: 'sm',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'Ruler',
                iconType: 'reactory',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.unitOfMeasure}'
              }
            },
          },
        },
        {
          title: 'No. of Sales Orders',
          field: 'numberOfSalesOrders',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
        {
          field: 'id',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCMSProductSalesOrdersTable@1.0.0',
            componentProps: {
              'rowData.id': ['formData.id'],
              'rowData.image': 'formData.image',
              'rowData.code': 'formData.code',
              'rowData.description': 'formData.description',
              'rowData.unitOfMeasure': 'formData.unitOfMeasure',
              'rowData.price': 'formData.price',
            },
            slideDirection: 'down',
            buttonVariant: 'Typography',
            buttonProps: {
              color: "#000000",
              style: { cursor: 'pointer', color: "#000000", textDecoration: 'underline' }
            },
            buttonTitle: 'View Sales Orders',
            windowTitle: 'Sales Orders',
          },
        }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        searchText: '${formContext.$formData.product}'
      },
      remoteData: true,
      query: 'products_table',
      variables: {
        'query.search': 'product',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'product': 'product',
        'products': 'data',
      },
    },
  }
};

const LasecProductSalesOrders: Reactory.IReactoryForm = {
  id: 'LasecProductSalesOrders',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Sales Orders',
  tags: ['CMS Product Sales Orders'],
  registerAsComponent: true,
  name: 'LasecProductSalesOrders',
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

export default LasecProductSalesOrders;
