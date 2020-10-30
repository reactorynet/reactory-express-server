import { Reactory } from '@reactory/server-core/types/reactory';
import { LasecGenerateSalesOrderFormData } from './GenerateSalesOrder';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';



const default_value = (quote_id: string): LasecGenerateSalesOrderFormData => ({
    header: {
        company_name: '',
        customer_name: '',
        quote_id: quote_id || null,
        sales_order_date: new Date()
    },
    customer_detail: {
        purchase_order_number: '',
        confirm_number: '',
        vat_number: ''
    },
    delivery_detail: {
        contact_number: '',
        delivery_address: '',
        method_of_contact: 'cellphone',
        on_day_contact: '',
        special_instruction: '',
        special_instructions_warehouse: ''
    },
    documents: {
        id: '',
        upload: '',
        uploadContext: 'lasec-crm.GenerateSalesOrder-${header.quote_id}',
        uploadedDocuments: [],
        view: 'lasec-crm.GenerateSalesOrder'
    },
    order_detail: {
        amounts_confirmed: false,
        order_type: '',
        part_supply: false,
        preferred_warehouse: '',
        quoted_amount: '',
        shipping_date: ''
    }
});

const GenerateSalesOrderForm: Reactory.IReactoryForm = {

    id: 'lasec-crm.GenerateSalesOrderForm',
    name: 'LasecGenerateSalesOrderForm',
    nameSpace: 'lasec-crm',
    version: '1.0.0',
    registerAsComponent: true,
    title: 'Generate Sales Order Form',
    uiFramework: 'material',
    uiSupport: ['material'],
    backButton: false,
    defaultFormValue: default_value('new'),
    schema,
    uiSchema,
    graphql,
    widgetMap: [
        { componentFqn: 'lasec-crm.SalesOrderHeaderWidget@1.0.0', widget: 'SalesOrderHeaderWidget' }
    ]
}

export default GenerateSalesOrderForm;