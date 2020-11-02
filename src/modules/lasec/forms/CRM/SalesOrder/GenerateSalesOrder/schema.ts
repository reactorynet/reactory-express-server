import { Reactory } from '@reactory/server-core/types/reactory';
import { DocumentFormSchema } from '@reactory/server-modules/lasec/forms/CRM/Client/Documents/shared/DocumentFormSchema';
import { cloneDeep } from 'lodash';

const header: Reactory.ISchema = {
    type: "object",
    properties: {
        quote_id: {
            type: 'string',
            title: 'Quote Id'
        },
        
        sales_order_date: {
            type: 'string',
            title: 'Quote Id'
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
}


const customer_detail: Reactory.ISchema = {
    type: "object",
    properties: {
        purchase_order_number: {
            type: 'string',
            title: 'Client PO Number',
            required: true,
            placeHolder: 'Enter PO Number'
        },
        confirm_number: {
            type: 'string',
            title: 'Confirm Client PO Number',
            required: true,
            placeHolder: 'Enter PO Number'
        },
        vat_number: {
            type: 'string',
            title: 'Enter VAT Number',
            required: true,
            placeHolder: 'Enter VAT number'
        }
    }
};

const order_detail: Reactory.ISchema = {
    type: "object",
    properties: {
        quoted_amount: {
            type: 'string',
            title: 'The quoted amount is ${formData}',
            required: true,
            placeHolder: '-'
        },
        amounts_confirmed: {
            type: 'boolean',
            title: 'Purchase order amount',            
            required: true,            
        },
        order_type: {
            type: 'string',
            title: 'Order type',
            required: true,
        },
        preffered_warehouse: {
            type: 'string',
            title: 'Preferred warehouse',
        },
        shipping_date: {
            type: 'string',
            format: 'date',
        },
        part_supply: {
            type: 'boolean',
            title: 'Purchase order amount',            
            required: true,            
        },
    }
};

const delivery_detail: Reactory.ISchema = {
    type: "object",
    properties: {
        delivery_address: {
            type: 'string',
            title: 'Delivery Address'
        },
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
            required: true
        },
        method_of_contact: {
            type: 'string',
            title: 'Method of contact',
            required: true
        },
        contact_number: {
            type: 'string',
            title: 'Contact number',
            required: true
        }
    }
}

const documents = cloneDeep<Reactory.ISchema>(DocumentFormSchema);
// newSchema.properties.paging = { ...PagingSchema }
documents.title = 'Documents';
documents.description = 'Attach documents to the sales order.';

const schema: Reactory.ISchema = {
    type: "object",
    title: "Generate Sales Order",
    properties: {
        header,
        customer_detail,
        order_detail,
        delivery_detail,
        documents
    }
};

export default schema;