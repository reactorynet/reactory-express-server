import { Reactory } from '@reactory/server-core/types/reactory'

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit'
    },
    showSubmit: false,
    showRefresh: false,
  },
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        top: '10px',
        right: '10px',
        position: 'absolute'
      },
    }
  },
  clientStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Status',
    }
  },

  firstName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Quote Code',
    }
  },
  lastName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Quote Code',
    }
  },
  country: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Quote Code',
    }
  },
};

const editUiSchema: any = {
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
  clientStatus: {},
  lastName: {},
  firstName: {},
  country: {},
};

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    clientStatus: {
      type: 'string',
    },
    firstName: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    country: {
      type: 'string',
    },
    view: {
      title: '',
      type: 'string'
    }
  }

};

const LasecCRMPersonalInformationForm: Reactory.IReactoryForm = {
  id: 'LasecCRMPersonalInformation',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMPersonalInformation',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: displayUiSchema,
  uiSchemas: [
    {
      id: 'display',
      title: 'Display Schema',
      key: 'display',
      description: 'View Client Details',
      icon: 'list',
      uiSchema: displayUiSchema,
    },
    {
      id: 'edit',
      title: 'Edit Schema',
      key: 'edit',
      description: 'Edit Client Details',
      icon: 'view_module',
      uiSchema: editUiSchema,
    },
  ],
  defaultFormValue: {
    clientStatus: "Test status",
    firstName: "Drew",
    lastName: "Murphy",
    country: "South Africa",
  },

};

export default LasecCRMPersonalInformationForm;
