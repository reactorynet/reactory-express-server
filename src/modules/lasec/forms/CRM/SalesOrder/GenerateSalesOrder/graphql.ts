import { Reactory } from '@reactory/server-core/types/reactory';

const GenerateSalesOrderGraphQL: Reactory.IFormGraphDefinition = {
    query: { 
        name: 'LasecGetPreparedSalesOrder',
        text: `query LasecGetPreparedSalesOrder($quote_id: String!){
            LasecGetPreparedSalesOrder(quote_id: $quote_id) {
                id        
                header {
                    sales_order_date
                    quote_id
                    customer_name   
                    company_name
                }
                customer_detail {
                    purchase_order_number
                    confirm_number
                    vat_numer
                }
                order_detail {
                    quoted_amount
                    amounts_confirmed
                    order_type
                    preferred_warehouse
                    shipping_date
                    part_supply
                }
                delivery_detail {
                    dlivery_address
                    special_instruction
                    on_day_contact
                    method_of_contact
                    contact_number
                }
                documents {
                    view
                    id
                    upload
                    uploadContext
                    uploadedDocuments {
                        id
                        link
                        filename
                    }
                }
            }
        }`,
        variables: {
            'formData.header.quote_id': 'quote_id'
        },
        autoQuery: true,
        new: true,
        resultMap: {
            'header': 'header',
            'customer_detail': 'customer_detail',
            'order_detail': 'order_detail',
            'delivery_detail': 'delivery_detail',
            'documents': 'documents'
        },
    },
    mutation: {
        new: {
            name: 'LasecGenerateSalesOrder',
            text: `mutation LasecGenerateSalesOrder($sales_order_input: LasecSalesOrderInput) {
                LasecGenerateSalesOrder(sales_order_input) {
                    success
                    message
                }
            }`,
            variables: {
                'formData': 'sales_order_input'
            },
            resultType: 'object',
            onSuccessMethod: 'notification',
            notification: {
                inAppNotification: true,
                body: 'Sales order has been created',
                props: {
                    timeout: 2500,
                    canDissmiss: true,
                    type: 'success'
                }
            },            
            objectMap: true,
            resultMap: {}
        }
    }
}



export default GenerateSalesOrderGraphQL;