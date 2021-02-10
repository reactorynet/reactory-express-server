import { Reactory } from '@reactory/server-core/types/reactory';
import { cloneDeep } from 'lodash';
import { DocumentSchema } from './shared/DocumentSchema';
import graphql from './graphql';
import { defaultUiResources } from '../../../uiResources';
import { ViewUiSchema } from './ViewClientDocuments';

export const EditSchema = cloneDeep<Reactory.ISchema>(DocumentSchema);
export const EditUiSchema: any = {
  'ui:options': {
    componentType: 'div',
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    showSubmit: false,
    showRefresh: false,
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      selectSchemaId: 'display',
      buttonVariant: 'outlined',
      style: {
        top: '10px'
      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      },
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12 },
    },
    {
      upload: { xs: 12, sm: 12, md: 12, lg: 12 },
      documents: { xs: 12, sm: 12, md: 12, lg: 12 },
      style: { marginTop: '25px' }
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      showLabel: false,
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  id: {
    'ui:widget': 'HiddenWidget',
    hidden: true
  },
  documents: {
    'ui:widget': 'ClientDocumentsWidget'
  },
  upload: {
    'ui:widget': 'ReactoryDropZoneWidget',
    'ui:options': {
      showLabel: false,
      //main container styles
      style: {},
      //properties for Reactory DropZone
      ReactoryDropZoneProps: {
        text: `Drop files here, or click to select files to upload`,
        accept: ['text/html', 'text/text', 'application/xml', 'application/pdf'],
        uploadOnDrop: true,
        name: 'LasecUploadDocument',
        mutation: {
          name: 'LasecUploadDocument',
          text: `mutation LasecUploadDocument($file: Upload!, $uploadContext: String){
            LasecUploadDocument(file: $file, uploadContext: $uploadContext) {
              id
              filename
              link
              mimetype
              size
            }
          }`,
          variables: {
            'uploadContext': 'lasec-crm::new-company::document'
          },
          onSuccessMethod: 'refresh',
        },
        iconProps: {
          icon: 'upload',
          color: 'secondary'
        },
        labelProps: {
          style: {
            display: 'block',
            paddingTop: '95px',
            height: '200px',
            textAlign: 'center',
          }
        },
        style: {
          minHeight: `200px`,
          outline: '1px dashed #E8E8E8'
        }
      },
    }
  },
};


export const LasecCRMEditClientDocuments: Reactory.IReactoryForm = {
  id: 'LasecCRMEditClientDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [...defaultUiResources],
  title: 'CRM Client Documents',
  tags: ['CRM Client Documents'],
  registerAsComponent: true,
  // name: 'LasecCRMClientDocuments',
  name: 'LasecCRMEditClientDocuments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: EditSchema,
  graphql,
  uiSchema: { ...EditUiSchema },
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Documents',
      icon: 'list',
      uiSchema: { ...ViewUiSchema }
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Edit Documents',
      icon: 'pencil',
      uiSchema: { ...EditUiSchema }
    },
  ],
  widgetMap: [
    { componentFqn: 'lasec-crm.ClientDocuments@1.0.0', widget: 'ClientDocumentsWidget' },
  ],
};
