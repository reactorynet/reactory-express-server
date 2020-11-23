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
                client {
                    id
                    mobileNumber
                }
                company_name
                company_id
                rep_code
                vat_number
                quoted_amount
                delivery_address
                delivery_address_id
                order_type
                preferred_warehouse
                shipping_date
                method_of_contact
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
            'customer_name': ['header.customer_name', 'delivery_detail.on_day_contact'],
            'company_name': 'header.company_name',
            'company_id': 'header.company_id',
            'rep_code': 'header.rep_code',
            'vat_number': 'customer.vat_number',
            'quoted_amount': 'order_detail.quoted_amount',            
            'delivery_address_id': 'delivery_detail.delivery_address.id',
            'delivery_address': 'delivery_detail.delivery_address.fullAddress',            
            'preferred_warehouse': 'order_detail.preffered_warehouse',
            'order_type': 'order_detail.order_type',            
            'client.mobileNumber': 'delivery_detail.contact_number',
            'shipping_date': 'order_detail.shipping_date',
            'method_of_contact': 'delivery_detail.method_of_contact'
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
                    salesOrder {
                        id
                        salesOrderNumber                        
                    }
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
                'formData.delivery_detail.delivery_address.id': 'sales_order_input.delivery_address_id',
                'formData.delivery_detail.special_instructions': 'sales_order_input.special_instructions',
                'formData.delivery_detail.special_instructions_warehouse': 'sales_order_input.special_instructions_warehouse',
                'formData.delivery_detail.on_day_contact': 'sales_order_input.on_day_contact',
                'formData.delivery_detail.method_of_contact': 'sales_order_input.method_of_contact',
                'formData.delivery_detail.contact_number': 'sales_order_input.contact_number',
                'formData.documents.uploadContext': 'sales_order_input.document_context',
                'formData.$upload_documents': 'sales_order_input.upload_documents',
            },
            resultType: 'object',            
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