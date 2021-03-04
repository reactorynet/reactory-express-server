import { Reactory } from '@reactory/server-core/types/reactory'

const $schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'ID'
    },
    contracts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', title: 'id' },
          company_id: { type: 'string', title: 'Company' },
          description: { type: 'string', title: 'Description' },
          expiry_date: { type: 'string', title: 'Expiry Date' },
          grand_total_excl_vat_cents: { type: 'number', title: 'Price' },
          name: { type: 'string', title: 'Name' },
          reference: { type: 'string', title: 'Reference' },
          unit_of_measure: { type: 'string', title: 'Company' },
        }
      }
    }
  }
}


const $graphql = {
  query: {
    name: 'LasecGetProductList',
    autoQuery: false,
    text: `query LasecGetProductById($productId: String!) {
        LasecGetProductById(productId: $productId) {
                id
                contracts {
                    id
                    company_id
                    description
                    expiry_date
                    grand_total_excl_vat_cents
                    name
                    reference
                    unif_of_measure
                }
            }
        }`,
    variables: {
      'formData.id': 'productId',
    },
    resultMap: {
      'id': 'id',
      'contracts': 'data'
    },
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,
  },
  id: {
    hidden: true,
    'ui:widget': 'HiddenWidget',
  },

  contracts: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Contract Name', field: 'name',
        },
        {
          title: 'Client Reference', field: 'company_id',
        },
        { title: 'Description', field: 'description' },
        {
          title: 'Unit of Measure',
          field: 'unit_of_measure',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'square_foot',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.unit_of_measure}',
              },
            },
          },
        },
        { title: 'Price', field: 'grand_total_excl_vat_cents' },
        { title: 'Expiry Date', field: 'expiry_date' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        paging: false,
      },
      remoteData: true,
      query: 'query',
      variables: {
        'formContext.$formData.id': 'productId'
      },
      resultMap: {
        'contracts.[].id': 'data.[].id',
        'contracts.[].company_id': 'data.[].company_id',
        'contracts.[].grand_total_excl_vat_cents': 'data.[].grand_total_excl_vat_cents',
        'contracts.[].name': 'data.[].name',
        'contracts.[].expiry_date': 'data.[].expiry_date',
        'contracts.[].reference': 'data.[].reference',
        'contracts.[].unit_of_measure': 'data.[].unit_of_measure',
        'contracts.[].description': 'data.[].description',
      },
      resultType: 'object',
    },
  }
};

const LasecProductContracts: Reactory.IReactoryForm = {
  id: 'LasecProductContracts',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Purchase Orders',
  tags: ['CMS Product Purchase Orders'],
  registerAsComponent: true,
  name: 'LasecProductContracts',
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

export default LasecProductContracts;
