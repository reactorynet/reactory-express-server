import { Reactory } from '@reactory/server-core/types/reactory';
import DocumentGridWidget from '@reactory/server-modules/lasec/forms/CRM/Client/Documents/shared/DocumentMaterialTableWidgetSchema';

export const DocumentsUISchema: Reactory.IUISchema = {
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
              'uploadContext': 'lasec-crm::generate-sales-order::document-${props.formContext.$formData.header.quote_id}'
            },
            onSuccessEvent: {
              name: 'lasec-crm::generate-sales-order::document::uploaded'
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




const GenerateSalesOrderUISchema: Reactory.IUISchema = {
    "ui:options": {
        componentType: "div",
        showSubmit: false,
        showRefresh: false,
        container: "div",
        containerStyles: {
            padding: '0px',
            marginTop: '16px'
        },
        style: {
            marginTop: '16px'
        }
    },
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
        {
            header: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },            
        },
        {
            customer_detail: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
        },
        {
            order_detail: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
        },
        {
            delivery_detail: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
        },
        {
            documents: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
        }
    ],
    header: {
        'ui:widget': 'SalesOrderHeaderWidget',
    },
    customer_detail: {
        'ui:field': 'GridLayout',
        'ui:grid-layout': [
            {
                purchase_order_number: { xs: 12, md: 4, lg: 3, xl: 2 },
                confirm_number: { xs: 12, md: 4, lg: 3, xl: 2 },
                vat_number: { xs: 12, md: 4, lg: 3, xl: 2 }
            }
        ]
    },
    order_detail: {
        'ui:field': 'GridLayout',
        'ui:grid-layout': [
            {
                amounts_confirmed: { xs: 12, md: 4, lg: 3, xl: 2 },
                order_type: { xs: 12, md: 4, lg: 3, xl: 2 },
                part_supply: { xs: 12, md: 4, lg: 3, xl: 2 },
                preferred_warehouse: { xs: 12, md: 4, lg: 3, xl: 2 },
                quoted_amount: { xs: 12, md: 4, lg: 3, xl: 2 },
                shipping_date: { xs: 12, md: 4, lg: 3, xl: 2 }
            }
        ]
    },
    delivery_detail: {
        'ui:field': 'GridLayout',
        'ui:grid-layout': [
            {
                contact_number: { xs: 12, md: 4, lg: 3, xl: 2 },
                delivery_address: { xs: 12, md: 4, lg: 3, xl: 2 },
                method_of_contact: { xs: 12, md: 4, lg: 3, xl: 2 },
                on_day_contact: { xs: 12, md: 4, lg: 3, xl: 2 },
                special_instruction: { xs: 12, md: 4, lg: 3, xl: 2 },
                special_instructions_warehouse: { xs: 12, md: 4, lg: 3, xl: 2 }
            }
        ]
    },
    documents: {
        ...DocumentsUISchema
    },
    
}


export default GenerateSalesOrderUISchema;