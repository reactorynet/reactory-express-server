'use strict';
import { Reactory } from '@reactory/server-core/types/reactory'
import { cloneDeep } from 'lodash';
import { DocumentFormSchema } from './shared/DocumentFormSchema';
import DocumentGridWidget from './shared/DocumentMaterialTableWidgetSchema';
import { EditUiSchema } from './EditClientDocuments';
import graphql from './graphql';
import { defaultUiResources } from '../../../uiResources';

const viewSchema = cloneDeep<Reactory.ISchema>(DocumentFormSchema);
export const ViewSchema = viewSchema;

export const ViewUiSchema: any = {
  'ui:graphql': {
    query: {
      name: 'LasecGetCustomerDocuments',
      text: `query LasecGetCustomerDocuments($id: String, $uploadContexts: [String], $paging: PagingRequest){
        LasecGetCustomerDocuments(id: $id, uploadContexts: $uploadContexts, paging: $paging){
          documents {
            id
            filename
            mimetype
            link
            size
            owner {
              id
              firstName
              fullName
            }
          }
        }
      }`,
      variables: {
        'formData.id': 'id',
        'formData.$uploadContexts': 'uploadContexts'
        // 'formData.$uploadContext': 'uploadContexts',
      },
      formData: {
        $uploadContexts: [
          'lasec-crm::company-document',
          'lasec-crm::new-company::document'
        ]
      },
      resultMap: {
        'documents': 'documents',
      },
      autoQuery: true,
      queryMessage: 'Loading customer documents',
      resultType: 'object',
      edit: false,
      new: false,
      refreshEvents: [
        {name: 'lasec-crm::new-document::uploaded'}
      ],
    },
    mutation: {
      new: {
        name: 'LasecUploadCustomerDocument',
        text: `mutation LasecUploadCustomerDocument($id: String, $file: Upload!){
          LasecUploadCustomerDocument(id: $id, file: $file) {
            id
            name
            url
            mimetype
          }
        }`,
        notification: {

        },
        variables: {

        },
        objectMap: true,

      }
    }
  },
  'ui:options': {
    componentType: 'div',
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit',
      buttonVariant: 'outlined',
      style: {
        top: '10px'
      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      }
    },
    showSchemaSelectorInToolbar: false,
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      documents: { xs: 12, sm: 12, md: 12, lg: 12 },
      style: { padding: "47px 32px 10px" }
    },
    {
      upload: { xs: 12, sm: 12, md: 12, lg: 12 },
      style: { paddingTop: "32px" }
    }
  ],
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
      style: {},
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

export const ConfirmUiSchema: any = {
  'ui:options': {
    componentType: 'div',
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '30px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px'
    }
  },
  'ui:grid-layout': [
    {
      documents: { sm: 12, md: 12 },
      style: { padding: '25px 32px 0 32px' }
    }
  ],

  documents: {
    'ui:widget': 'ClientDocumentsWidget'
  },

  // uploadedDocuments: {
  //   ...DocumentGridWidget,
  //   'ui:options': {
  //     ...DocumentGridWidget['ui:options'],
  //     query: 'PagedNewCustomerDocuments',
  //     variables: {
  //       'formData.paging': 'paging',
  //       'formContext.$formData.uploadContext': 'uploadContexts',
  //     },
  //   }
  // }
};

export const LasecCRMViewClientDocuments: Reactory.IReactoryForm = {
  id: 'LasecCRMViewClientDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [...defaultUiResources],
  title: 'CRM Client Documents',
  tags: ['CRM Client Documents'],
  registerAsComponent: true,
  // name: 'LasecCRMClientDocuments',
  name: 'LasecCRMViewClientDocuments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: { ...ViewSchema, title: 'CLIENT DOCUMENTS' },
  graphql,
  uiSchema: { ...ViewUiSchema },
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
      title: 'Edit',
      key: 'edit',
      description: 'Edit Documents',
      icon: 'edit',
      uiSchema: { ...EditUiSchema }
    },
  ],
  widgetMap: [
    { componentFqn: 'lasec-crm.ClientDocuments@1.0.0', widget: 'ClientDocumentsWidget' },
  ],
};
