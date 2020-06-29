import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    documentIds: {
      type: 'string',
      title: 'Documents'
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: 0,
      margin: 0,
    },
    style: {
      padding: 0,
      margin: 0,
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '8px',
    marginBottom: '20px',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      documentIds: { xs: 12 },
    },
  ],

  documentIds: {
    'ui:widget': 'DocumentListWidget',
    'ui:options': {
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

};

const LasecCRMISODetailDocuments: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetailDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetailDocuments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'core.DocumentListComponent@1.0.0', widget: 'DocumentListWidget' },
  ],
};

export default LasecCRMISODetailDocuments;
