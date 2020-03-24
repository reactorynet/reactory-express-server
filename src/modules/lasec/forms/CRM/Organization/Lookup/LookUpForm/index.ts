import { Reactory } from '@reactory/server-core/types/reactory';
import $graphql from './graphql';

const uiSchema: any = {
  'ui:options': {
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    submitIcon: 'search',
    componentType: "form",
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { search: { md: 4, sm: 12 } },
    { organisations: { sm: 12 } },
  ],
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Search',
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  organisations: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: "Organisation Name", field: "name" },
        { title: "Organisation Number", field: "id" },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'organisations': 'data',
      },
      resultType: 'object',
    }
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    search: {
      type: 'string',
      title: 'Search'
    },
    paging: {
      type: 'object',
      title: 'Paging',
      properties: {
        total: {
          type: 'number'
        },
        page: {
          type: 'number'
        },
        pageSize: {
          type: 'number'
        },
        hasNext: {
          type: 'boolean'
        }
      }
    },
    organisations: {
      type: 'array',
      items: {
        id: {
          type: "string",
          title: "Organisation Number"
        },
        name: {
          type: "string",
          title: "Organisation Name"
        },
      },
    }
  }
};

const LasecCRMOrganisationLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMOrganisationLookupTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Organisation Lookup Table',
  tags: ['CRM Organisation Lookup Table'],
  registerAsComponent: true,
  name: 'LasecCRMOrganisationLookupTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  graphql: $graphql,
  widgetMap: [],
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    organisations: []
  }
};

export default LasecCRMOrganisationLookupForm;
