import { Reactory } from '@reactory/server-core/types/reactory';
import { cloneDeep } from 'lodash';
import { DocumentSchema } from './shared/DocumentSchema';
import graphql from './graphql';
import { defaultUiResources } from '../../../uiResources';

export const EditSchema = cloneDeep<Reactory.ISchema>(DocumentSchema);
//Display schema for editing
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
      buttonVariant: "contained",
      selectSchemaId: 'display',
      style: {
        position: 'absolute',
        top: '-20px',
        right: 0,
      }
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { md: 12 },
    },
    {
      id: { md: 12 },
      upload: { md: 12 },
      uploadedDocuments: { md: 12 },
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        top: '10px',
        right: '10px',
        position: 'relative'
      },
    }
  },
  id: {
    'ui:widget': 'HiddenWidget',
    hidden: true
  },
  documents: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Filename', field: 'filename'
        },
        {
          title: 'Link', field: 'link'
        }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      }
    }
  },
  upload: {
    'ui:widget': 'ReactoryDropZoneWidget',
    'ui:options': {
      //main container styles
      style: {

      },
      //properties for Reactory DropZone
      ReactoryDropZoneProps: {
        text: `Drop files here, or click to select files to upload`,
        accept: ['text/html', 'text/text', 'application/xml', 'application/pdf'],
        uploadOnDrop: true,
        name: 'LasecUploadDocument',
        mutation: {
          text: `mutation LasecUploadDocument($id: String, $file: Upload!, $uploadContext: String){
            LasecUploadDocument(id: $id, file: $file, uploadContext: $uploadContext) {
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
  name: 'LasecCRMClientDocuments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: EditSchema,
  graphql,
  uiSchema: { ...EditUiSchema },
  uiSchemas: [
    {
      id: 'edit',
      title: 'VIEW',
      key: 'edit',
      description: 'Edit Documents',
      icon: 'pencil',
      uiSchema: { ...EditUiSchema }
    },
  ],
};
