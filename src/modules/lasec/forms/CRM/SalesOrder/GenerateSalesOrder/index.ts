import { Reactory } from '@reactory/server-core/types/reactory';
import { LasecGenerateSalesOrderFormData } from './GenerateSalesOrder';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';



const default_value = (quote_id: string): LasecGenerateSalesOrderFormData => ({
    $paging: {
        page: 1,
        pageSize: 10
    },
    header: {
        company_name: '',
        customer_name: '',
        quote_id: quote_id || null,
        sales_order_date: new Date().toISOString(),
    },
    customer_detail: {
        purchase_order_number: '',
        confirm_number: '',
        vat_number: ''
    },
    delivery_detail: {
        contact_number: '',
        delivery_address: {
            id: '',
            fullAddress: ''
        },
        method_of_contact: 'call',
        on_day_contact: '',
        special_instruction: '',
        special_instructions_warehouse: ''
    },
    $upload_documents: 'no',
    documents: {
        id: '',
        upload: '',
        uploadContext: null,
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
    helpTopics: ['lasec-sales-order-generation'],    
    backButton: false,
    schema,
    uiSchema,
    graphql,
    widgetMap: [
        { componentFqn: 'lasec-crm.SalesOrderHeaderWidget@1.0.0', widget: 'SalesOrderHeaderWidget' },
        { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    ]
}

export default GenerateSalesOrderForm;