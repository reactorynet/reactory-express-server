import { Reactory } from '@reactory/server-core/types/reactory';

export interface LasecGenerateSalesOrderFormData {
    header: {
        sales_order_date: Date,
        quote_id: string,
        customer_name: string,
        company_name: string
    },
    customer_detail: {
        purchase_order_number: string
        confirm_number: string
        vat_number: string
    },
    order_detail: {
        quoted_amount: string
        amounts_confirmed: boolean
        order_type: string
        preferred_warehouse: string
        shipping_date: string,
        part_supply: boolean
    },
    delivery_detail: {
        delivery_address: string
        special_instruction: string
        special_instructions_warehouse: string
        on_day_contact: string
        method_of_contact: string
        contact_number: string
    },
    documents: {
        view: string
        id: string
        upload: string
        uploadContext: string
        uploadedDocuments: Reactory.IReactoryFile[]
    }
}