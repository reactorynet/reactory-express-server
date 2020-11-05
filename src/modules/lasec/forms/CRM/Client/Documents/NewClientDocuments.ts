'use strict';
import { Reactory } from '@reactory/server-core/types/reactory'
import { cloneDeep } from 'lodash';
import { DocumentFormSchema } from './shared/DocumentFormSchema';
import DocumentGridWidget from './shared/DocumentMaterialTableWidgetSchema';
import graphql from './graphql';
import PagingSchema from '../Schemas/Paging';
import { defaultUiResources } from '../../../uiResources';

const newSchema = cloneDeep<Reactory.ISchema>(DocumentFormSchema);
// newSchema.properties.paging = { ...PagingSchema }
newSchema.title = 'UPLOAD CLIENT DOCUMENTS';
// newSchema.description = 'Use the area below to add files for this customer.';
export const NewSchema = newSchema;

export const NewUiSchema: any = {
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
    marginBottom: '25px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px',
      marginBottom: '20px'
    }
  },
  'ui:grid-layout': [

    {
      upload: { lg: 6, md: 6, sm: 12, },
      uploadedDocuments: { lg: 6, md: 6, sm: 12 },
      style: { padding: '25px 32px 0 32px' }
    }
  ],

  view: {
    'ui:widget': 'HiddenWidget',
  },
  id: {
    'ui:widget': 'HiddenWidget',
  },

  upload: {
    'ui:widget': 'ReactoryDropZoneWidget',
    'ui:options': {
      style: {

      },
      ReactoryDropZoneProps: {
        text: `Drop files here, or click to select files to upload`,
        accept: ['text/html', 'text/text', 'application/xml', 'application/pdf'],
        uploadOnDrop: true,
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
          onSuccessEvent: {
            name: 'lasec-crm::new-company::document::uploaded'
          }
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

  uploadedDocuments: {
    ...DocumentGridWidget,
    'ui:options': {
      ...DocumentGridWidget['ui:options'],
      options: {
        ...DocumentGridWidget['ui:options'].options,
        toolbar: true,
        selection: true,
      },
      actions: [
        {
          icon: 'remove_circle',
          tooltip: 'Remove Files',
          iconProps: {
            color: 'error'
          },
          mutation: 'delete',
          variables: {
            'formContext.formData.uploadContext': 'uploadContext',
            'selected[].id': 'fileIds',
          },
          resultMap: {

          },
          resultAction: 'refresh',
        },
      ]
    }
  },
};


export const LasecCRMNewClientDocuments: Reactory.IReactoryForm = {
  id: 'LasecCRMNewClientDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [...defaultUiResources],
  title: 'CRM Client Documents',
  tags: ['CRM Client Documents'],
  registerAsComponent: true,
  name: 'LasecCRMNewClientDocuments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: { ...NewSchema },
  graphql: {
    ...graphql,
    query: {
      ...graphql.query,
      text: `query LasecGetCustomerDocuments($uploadContexts: [String], $paging: PagingRequest){
        LasecGetCustomerDocuments(uploadContexts: $uploadContexts, paging: $paging){
          paging {
            total
            page
            pageSize
          }
          documents {
            id
            filename
            mimetype
            link
            size
          }
        }
      }`,
      variables: {
        'formData.id': 'id',
        'formData.paging': 'paging',
        'formData.uploadContexts': 'uploadContexts',
      },
    },
    mutation: {
      delete: {
        name: 'LasecDeleteNewClientDocuments',
        text: `
          mutation LasecDeleteNewClientDocuments($fileIds: [String]!){
            LasecDeleteNewClientDocuments(fileIds: $fileIds){
              description
              text
              status
            }
          }
        `,
        variables: {
          'selected.[].id': 'fileIds'
        },
        objectMap: true,
        onSuccessEvent: {
          name: 'lasec-crm::new-company::documents::delete'
        },
      }
    }
  },
  uiSchema: { ...NewUiSchema },
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'Upload Document For New Client',
      icon: 'add',
      uiSchema: { ...NewUiSchema },
    },
  ],
  defaultFormValue: {
    id: 'new_client',
    paging: {
      page: 1,
      pageSize: 10,
    },
    uploadedDocuments: [],
    upload: '',
    uploadContexts: [
      `lasec-crm::new-company::document`,
    ]
  }
};
