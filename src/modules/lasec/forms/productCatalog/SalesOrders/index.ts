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
            name
            code
            description
            qtyAvailable
            qtyOnHand
            qtyOnOrder
            unitOfMeasure
            price
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
  },
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  view: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '',
          field: 'onSyspro',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'on_syspro',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#9AD86E'
                    },
                    tooltip: 'ON SYSPRO'
                  },
                  {
                    key: 'not_on_syspro',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'NOT ON SYSPRO'
                  },
                  {
                    key: 'on_hold',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'ON HOLD'
                  },
                  {
                    key: 'on_partial_hold',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
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
              component: 'core.ImageComponent@1.0.0',
              props: {
                'ui:options': {
                  variant: 'rounded',
                  style: {
                    marginLeft: '16px'
                  }
                },
              },
              propsMap: {
                'rowData.image': 'value',
              },
            },
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.LasecAddProductToQuote@1.0.0',
                componentProps: {
                  'rowData.code': 'formData.id'
                },
                slideDirection: 'down',
                buttonVariant: 'Fab',
                buttonProps: {
                  color: "#23A06A",
                  size: 'small',
                  style: {
                    marginLeft: '16px',
                    backgroundColor: "#23A06A",
                    color: '#fff'
                  }
                },
                buttonIcon: 'add',
                windowTitle: 'Add to quote ${rowData.code}',
              },
            }
          ],
          width: '150px',
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
