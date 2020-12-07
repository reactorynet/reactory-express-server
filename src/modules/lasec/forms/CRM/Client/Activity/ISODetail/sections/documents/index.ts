
import { Reactory } from '@reactory/server-core/types/reactory'
import { DocumentFormSchema } from '@reactory/server-modules/lasec/forms/CRM/Client/Documents/shared/DocumentFormSchema';
import DocumentGridWidget from '@reactory/server-modules/lasec/forms/CRM/Client/Documents/shared/DocumentMaterialTableWidgetSchema';
import { cloneDeep } from 'lodash';


const schema = cloneDeep<Reactory.ISchema>(DocumentFormSchema);

schema.title = 'Documents';
schema.description = 'Attach documents to the sales order.';
schema.properties.uploadedDocuments.title = 'Uploaded files';


const uiSchema : Reactory.IUISchema = {
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
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      upload: { lg: 6, md: 6, sm: 12, },
      uploadedDocuments: { lg: 6, md: 6, sm: 12 },      
    }
  ],
  view: {
    'ui:widget': 'HiddenWidget',
  },
  id: {
    'ui:widget': 'HiddenWidget',
  },

  uploadContext: {
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
            'uploadContext': 'lasec-crm::sales-order::document-${props.formContext.data.orderId}'
          },
          onSuccessEvent: {
            name: 'lasec-crm::sales-order::document::uploaded'
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
        title: 'Files uploaded for sales order',
        selection: true,
      },
      query: 'documents_list',
      refreshEvents: [
        { name: 'lasec-crm::sales-order::document::uploaded' }
      ],      
      actions: [
        {
          icon: 'remove_circle',
          tooltip: 'Remove Files',
          iconProps: {
            color: 'error'
          },
          mutation: 'delete',
          variables: {            
            'selected[].id': 'fileIds',
          },
          resultMap: {

          },
          resultAction: 'refresh',
        },
      ]
    }
  },
};;

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    documents_list: {
      name: 'LasecGetCustomerDocuments',
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
                owner {
                  id
                  firstName
                  fullName
                }
              }
            }
          }`,
      variables: {
        'props.formContext.formData.documents.$paging': 'paging',
        'props.formContext.formData.documents.uploadContext': 'uploadContexts',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'documents': 'data',
      },
      resultType: 'object',
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
  graphql,
  uiSchema: uiSchema,
  defaultFormValue: {},  
};

export default LasecCRMISODetailDocuments;
