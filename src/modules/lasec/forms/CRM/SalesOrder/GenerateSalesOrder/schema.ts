import { Reactory } from '@reactory/server-core/types/reactory';
import { DocumentFormSchema } from '@reactory/server-modules/lasec/forms/CRM/Client/Documents/shared/DocumentFormSchema';
import { cloneDeep } from 'lodash';

import AddressSchema from '@reactory/server-modules/lasec/forms/CRM/Shared/Address';

const header: Reactory.ISchema = {
    type: "object",
    required: [],
    properties: {
        quote_id: {
            type: 'string',
            title: 'Quote Id'
        },

        sales_order_date: {
            type: 'string',
            title: 'Quote Id'
        },

        company_id: {
            type: 'string',
            title: 'Company Id'
        },

        customer_name: {
            type: 'string',
            title: 'Customer name'
        },

        company_name: {
            type: 'string',
            title: 'Company name'
        },

        rep_code: {
            type: 'string',
            title: 'Rep Code'
        }
    }
};


const customer_detail: Reactory.ISchema = {
    type: "object",
    title: 'Customer Details',
    required: ['purchase_order_number', 'confirm_number'],
    properties: {
        purchase_order_number: {
            type: 'string',
            title: 'Client PO Number',
            placeHolder: 'Enter PO Number'
        },
        confirm_number: {
            type: 'string',
            title: 'Confirm Client PO Number',
            placeHolder: 'Enter PO Number'
        },
        vat_number: {
            type: 'string',
            title: 'Enter VAT Number',
            placeHolder: 'Enter VAT number'
        }
    }
};

const order_detail: Reactory.ISchema = {
    type: "object",
    title: 'Order Details',
    required: ['quoted_amount', 'order_type', 'preffered_warehouse'],
    properties: {
        quoted_amount: {
            type: 'number',
            title: 'Quoted Amount',
            placeHolder: '-'
        },
        amounts_confirmed: {
            type: 'boolean',
            title: 'Confirm order amount',
        },
        order_type: {
            type: 'string',
            title: 'Order type',
        },
        preffered_warehouse: {
            type: 'string',
            title: 'Preferred warehouse',
        },
        shipping_date: {
            type: 'string',
            title: 'Shipping Date'
        },
        part_supply: {
            type: 'boolean',
            title: 'Part Supply',
        },
    }
};

const delivery_detail: Reactory.ISchema = {
    type: "object",
    title: 'Shipment and Delivery Details',
    required: ['on_day_contact', 'method_of_contact', 'contact_number', 'delivery_address'],
    properties: {
        delivery_address: { ...AddressSchema },
        special_instructions: {
            type: 'string',
            title: 'Special instructions (only for delivery)',
            placeHolder: 'Add your note here'
        },
        special_instructions_warehouse: {
            type: 'string',
            title: 'Special instructions (for admin/warehouse only)',
            placeHolder: 'Add your note here'
        },
        on_day_contact: {
            type: 'string',
            title: 'On-day contact person',
        },
        method_of_contact: {
            type: 'string',
            title: 'Method of contact',
        },
        contact_number: {
            type: 'string',
            title: 'Contact number',
        }
    }
}

const $paging: Reactory.IObjectSchema = {
    type: "object",
    title: "Document Paging",
    properties: {
        page: {
            type: 'number',
            title: 'Page'
        },
        pageSize: {
            type: 'number',
            title: 'Page Size'
        }
    }
}

const $upload_documents: Reactory.ISchema = {
    type: "string",
    title: "Upload Purchase Order Documents",
    default: 'no',
    enum: ['yes', 'no'],
}

const documents = cloneDeep<Reactory.ISchema>(DocumentFormSchema);
// newSchema.properties.paging = { ...PagingSchema }
documents.title = 'Documents';
documents.description = 'Attach documents to the sales order.';
documents.properties.uploadedDocuments.title = 'Uploaded files.';

const schema: Reactory.ISchema = {
    type: "object",
    title: "Generate Sales Order",
    required: [],
    dependencies: {
        '$upload_documents': {
            oneOf: [
                {
                    properties: {
                        documents,
                        $upload_documents: {
                            enum: ['yes']
                        },
                    }
                }
            ]
        }
    },
    properties: {
        $paging,
        header,
        customer_detail,
        order_detail,
        delivery_detail,
        $upload_documents,
    }
};

export default schema;