import { Reactory } from '@reactory/server-core/types/reactory'
// import $uiSchema from './uiSchema';
// import $graphql from './graphql';

const graphql = {
  query: {
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
        orders {
          id
          date
        }
      }
    }`,
    variables: {
      'formData.product': 'product',
      'formData.paging': 'paging'
    },
    resultMap: {
      'paging': 'paging',
      'orders.[].id': 'orders.[].id',
      'orders.[].date': 'orders.[].date',
    },
    resultType: 'object',
    edit: false,
    new: false,
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    product: {
      type: 'string',
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          date: {
            type: 'string'
          },
        }
      },
    }
  }

};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
  },
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Order Date', field: 'date' },
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
        'orders.[].id': 'data.[].id',
        'orders.[].date': 'data.[].name',
      },
    },
  }
};

const LasecCMSProductSalesOrders: Reactory.IReactoryForm = {
  id: 'LasecCMSProductSalesOrdersTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Sales Orders',
  tags: ['CMS Product Sales Orders'],
  registerAsComponent: true,
  name: 'LasecCMSProductSalesOrdersTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql: graphql,
  uiSchema: uiSchema,
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
  ],
};

export default LasecCMSProductSalesOrders;
