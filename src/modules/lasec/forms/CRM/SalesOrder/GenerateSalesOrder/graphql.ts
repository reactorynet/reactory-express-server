import { Reactory } from '@reactory/server-core/types/reactory';

const GenerateSalesOrderGraphQL: Reactory.IFormGraphDefinition = {
    query: {
        name: 'LasecGetPreparedSalesOrder',
        text: `query LasecGetPreparedSalesOrder($quote_id: String!){
            LasecGetPreparedSalesOrder(quote_id: $quote_id) {
                id        
                quote_id
                sales_order_date
                customer_name
                company_name
                rep_code
                vat_number
                quoted_amount
                delivery_address
            }
        }`,
        variables: {
            'formData.header.quote_id': 'quote_id'
        },
        autoQuery: true,
        new: true,
        resultMap: {
            'quote_id': 'header.quote_id',
            'sales_order_date': 'header.sales_order_date',
            'customer_name': 'header.customer_name',
            'company_name': 'header.company_name',
            'rep_code': 'header.rep_code',
            'vat_number': 'customer.vat_number',
            'quoted_amount': 'order_detail.quoted_amount',
            'delivery_address': 'delivery_detail.delivery_address.fullAddress'
        },
        resultType: 'object',
    },
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
    mutation: {
        new: {
            name: 'LasecCreateSalesOrder',
            text: `mutation LasecCreateSalesOrder($sales_order_input: LasecCreateSalesOrderInput) {
                LasecCreateSalesOrder(sales_order_input: $sales_order_input) {
                    success
                    message
                }
            }`,
            variables: {
                'formData.header.quote_id': 'sales_order_input.quote_id',
                'formData.header.sales_order_date': 'sales_order_input.sales_order_date',
                'formData.header.customer_name': 'sales_order_input.customer_name',
                'formData.header.company_name': 'sales_order_input.company_name',
                'formData.header.rep_code': 'sales_order_input.rep_code',
                'formData.customer_detail.purchase_order_number': 'sales_order_input.purchase_order_number',
                'formData.customer_detail.confirm_number': 'sales_order_input.confirm_number',
                'formData.customer_detail.vat_number': 'sales_order_input.vat_number',
                'formData.order_detail.quoted_amount': 'sales_order_input.quoted_amount',
                'formData.order_detail.amounts_confirmed': 'sales_order_input.amounts_confirmed',
                'formData.order_detail.order_type': 'sales_order_input.order_type',
                'formData.order_detail.preffered_warehouse': 'sales_order_input.preffered_warehouse',
                'formData.order_detail.shipping_date': 'sales_order_input.shipping_date',
                'formData.order_detail.part_supply': 'sales_order_input.part_supply',
                'formData.delivery_detail.delivery_address.fullAddress': 'sales_order_input.delivery_address',
                'formData.delivery_detail.special_instructions': 'sales_order_input.special_instructions',
                'formData.delivery_detail.special_instructions_warehouse': 'sales_order_input.special_instructions_warehouse',
                'formData.delivery_detail.on_day_contact': 'sales_order_input.on_day_contact',
                'formData.delivery_detail.method_of_contact': 'sales_order_input.method_of_contact',
                'formData.delivery_detail.contact_number': 'sales_order_input.contact_number',                
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
        },
        delete: {
            name: 'LasecDeleteNewClientDocuments',
            text: `
              mutation LasecDeleteNewClientDocuments($fileIds: [String]!){
                LasecDeleteNewClientDocuments(fileIds: $fileIds){
                  description
                  text
                  status
                }
              }
            `,
            variables: {
                'selected.[].id': 'fileIds'
            },
            objectMap: true,
            onSuccessEvent: {
                name: 'lasec-crm::sales-orders::documents::delete'
            },
        }
    }
};

export default GenerateSalesOrderGraphQL;