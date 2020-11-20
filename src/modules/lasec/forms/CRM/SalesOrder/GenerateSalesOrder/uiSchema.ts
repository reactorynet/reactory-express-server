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
        title: 'Files uploaded for sales order',
        selection: true,
      },
      refreshEvents: [
        { name: 'lasec-crm::generate-sales-order::document::uploaded' }
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
};

const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';

const GOOGLE_PLACE_TO_ADDRESS_MAP = {
  'address': 'fullAddress',
  'placeId': 'map.place_id'
};

const DEFAULT_ADDRESS_PROPS = {
  viewMode: 'MAP_WITH_SEARCH|ADDRESS_LABEL',
  objectMap: GOOGLE_PLACE_TO_ADDRESS_MAP,
  checkExists: true,
  query: `query LasecCheckAddressExists($input: Any!, $create: Boolean, $mapProvider: String){
    LasecCheckAddressExists(input: $input, create: $create, mapProvider: $mapProvider) {
      id
      fullAddress
      addressLine1
      addressLine2
      city
      zipCode
      state
      countryCode
      countryName
      lat
      long
    }
  }`,  
  variables: {
    'formData': 'input'
  },
  resultName: 'LasecCheckAddressExists',
  resultMap: {
    '*':'*'
  }
};


const SalesOrderDocumentSchema = {
  ...DocumentsUISchema
};

SalesOrderDocumentSchema.uploadedDocuments["ui:options"].query = 'documents_list';
delete SalesOrderDocumentSchema.uploadedDocuments["ui:options"].variables;
delete SalesOrderDocumentSchema.uploadedDocuments["ui:options"].resultMap;

const GenerateSalesOrderUISchema: Reactory.IUISchema = {
  "ui:options": {
    componentType: "div",
    showSubmit: true,
    showHelp: true,
    showRefresh: true,
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
      $upload_documents: {xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
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
        quoted_amount: { xs: 12, md: 12, lg: 12, xl: 12 },
        amounts_confirmed: { xs: 12, md: 12, lg: 12, xl: 12 },
        order_type: { xs: 12, md: 4, lg: 3, xl: 2 },
        preffered_warehouse: { xs: 12, md: 4, lg: 3, xl: 2 },
        shipping_date: { xs: 12, md: 4, lg: 3, xl: 2 },
        part_supply: { xs: 12, md: 12, lg: 12, xl: 12 },
      }
    ],
    quoted_amount: {
      'ui:widget': 'StyledCurrencyLabel',
      'ui:options': {
        inlineLabel: true,
        label: "The quoted amount is",
        defaultStyle: {
          fontWeight: 'bold'
        },
      },
    },
    order_type: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'normal', value: 'normal', label: 'Normal' },
          { key: 'appro', value: 'appro', label: 'Appro' },
          { key: 'so3', value: 'so3', label: 'Standing Order 3' },
          { key: 'so4', value: 'so4', label: 'Standing Order 4' },
          { key: 'dnp', value: 'dnp', label: 'DNP' },
          { key: 'consolidated', value: 'consolidated', label: 'Consolidated' },
        ],
      },
    },
    amounts_confirmed: {
      'ui:options': {
        yesLabel: 'I confirm the Purchase order Amount is the same as the Quoted Amount',
        noLabel: 'I have not confirmed that the Purchase order Amount is the same as the Quoted Amount'
      }
    },
    preffered_warehouse: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: '10', value: '10', label: 'Cape Town' },
          { key: '20', value: '20', label: 'Gauteng' },
        ],
      },
    },
    shipping_date: {
      'ui:widget': 'DateSelectorWidget'
    },
    part_supply: {
      'ui:options': {
        yesLabel: 'This is order is a PART supply',
        noLabel: 'This order is a full shipment'
      }
    }
  },
  delivery_detail: {
    'ui:title': 'Shipment and delivery details',
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        delivery_address: { xs: 12, md: 12, lg: 12, xl: 12 },
        special_instructions: { xs: 12, md: 12, lg: 12, xl: 12 },
        special_instructions_warehouse: { xs: 12, md: 12, lg: 12, xl: 12 },
        on_day_contact: { xs: 12, md: 4, lg: 3, xl: 2 },
        method_of_contact: { xs: 12, md: 4, lg: 3, xl: 2 },
        contact_number: { xs: 12, md: 4, lg: 3, xl: 2 },
      }
    ],
    delivery_address: {
      'ui:widget': 'ReactoryGoogleMapWidget',
      'ui:options': {
        props: DEFAULT_ADDRESS_PROPS,
        mapProps: {
          googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY_DEVELOPMENT}&v=3.exp&libraries=geometry,drawing,places`,
        }
      }
    },
    method_of_contact: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'call', value: 'call', label: 'Call on Cell' },
          { key: 'whatsapp', value: 'whatsapp', label: 'WhatsApp' },
          { key: 'sms', value: 'sms', label: 'SMS' },
        ],
      },
    },
  },
  $upload_documents: {
    'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'yes', value: 'yes', label: 'Yes, I have the documents' },
          { key: 'no', value: 'no', label: 'No, I will upload them later' },
        ],
      },
  },
  documents: SalesOrderDocumentSchema
}


export default GenerateSalesOrderUISchema;