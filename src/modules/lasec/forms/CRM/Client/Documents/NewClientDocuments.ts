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
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit'
    },
    style:{
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
      id: { md: 12, style: { height: 0, display: 'none' } },
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
    'ui:widget':'HiddenWidget',
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
    ...DocumentGridWidget
  },    
};


export const LasecCRMNewClientDocuments: Reactory.IReactoryForm = {
  id: 'LasecCRMNewClientDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [ ...defaultUiResources ],
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
            link
            size
          }        
        }      
      }`,
      variables: {      
        'formData.$uploadContexts': 'uploadContexts'            
      },
      formData: {
        $uploadContext: [
          'lasec-crm::new-company::document',
          'lasec-crm::company-document'
        ]
      }, 
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
    upload: ''
  }  
};