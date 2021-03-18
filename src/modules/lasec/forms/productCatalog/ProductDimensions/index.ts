import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from '../shared/graphql';
import $schema from '../shared/schema';


const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
  },
  'ui:grid-layout': [
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0 } }
  ],
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'ProductGrid',
    'ui:options': {
      componentProps: {
        cardContent: {
          fields: [
            {
              label: 'Packed length',
              value: 'packedLength',
              unit: 'cm',
              icon: ''
            },
            {
              label: 'Packed Width',
              value: 'packedWidth',
              unit: 'cm',
              icon: ''
            },
            {
              label: 'Packed Height',
              value: 'packedHeight',
              unit: 'cm',
              icon: ''
            },
            {
              label: 'Packed Volume',
              value: 'packedVolume',
              unit: 'm3',
              icon: ''
            },
            {
              label: 'Packed Weight',
              value: 'packedWeight',
              unit: 'kg',
              icon: ''
            },
          ]
        },
      },
      loadingMessage: 'Loading product dimensions, please wait a moment',
      remoteData: true,
      variables: {
        'formContext.$formData.product': 'product',
        'formContext.$formData.paging': 'paging'
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
    }
  }
};

export const cards_graph: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetProductList',
    autoQuery: true,
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
          landedPrice
          wh10CostPrice
          threeMonthAvePrice
          listPrice
          onSyspro
          onSpecial
          currencyCode
          specialPrice
          productPricing {
            cost_price_cents
            max_price_cents
            min_price_cents
            min_non_authorisation_price_cents
            three_month_ave_price_cents
            list_price_cents
            currency_symbol
            currency_code
            currency_description
            special_price_cents
          }
          availableCurrencies
        }
      }
    }`,
    variables: {
      'formData.product': 'product',
      'formData.paging': 'paging'
      // 'formContext.$formData.product': 'product',
      // 'formContext.$formData.paging': 'paging'
    },
    resultMap: {
      'paging': 'paging',
      'product': 'product',
      'products[].id': 'products[].id',
      'products[].name': 'products[].name',
      'products[].code': 'products[].code',
      'products[].description': 'products[].description',
      'products[].qtyAvailable': 'products[].qtyAvailable',
      'products[].qtyOnHand': 'products[].qtyOnHand',
      'products[].qtyOnOrder': 'products[].qtyOnOrder',
      'products[].unitOfMeasure': 'products[].unitOfMeasure',
      'products[].price': 'products[].price',
      'products[].image': 'products[].image',
      'products[].onSyspro': 'products[].onSyspro',
      'products[].priceAdditionalInfo': 'products[].priceAdditionalInfo',
      'products[].landedPrice': 'products[].landedPrice',
      'products[].wh10CostPrice': 'products[].wh10CostPrice',
      'products[].threeMonthAvePrice': 'products[].threeMonthAvePrice',
      'products[].listPrice': 'products[].listPrice',
      'products[].productPricing': 'products[].productPricing',
      'products[].onSpecial': 'products[].onSpecial',
      'products[].currencyCode': 'products[].currencyCode',
      'products[].specialPrice': 'products[].specialPrice',
      'products[].availableCurrencies': 'products[].availableCurrencies',
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
};

const LasecProductDimensions: Reactory.IReactoryForm = {
  id: 'LasecProductDimensions',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Dimensions',
  tags: ['CMS Product Dimensions'],
  registerAsComponent: true,
  name: 'LasecProductDimensions',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  // graphql: cards_graph,
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
    // { componentFqn: 'core.GridLayoutComponent@1.0.0', widget: 'GridLayoutWidget' }
    { componentFqn: 'lasec-crm.LasecProductGrid@1.0.0', widget: 'ProductGrid' }
  ],
};

export default LasecProductDimensions;
