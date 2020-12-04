import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetISO',
    text: `query SalesOrder($sales_order_id: String!) {
      LasecGetISO (sales_order_id: $sales_order_id) {
        id
        orderDate
        salesOrderNumber
        shippingDate
        
        quoteId
        quoteDate
        
        orderType
        orderStatus
    
        iso  
        
        customer
        
        crmCustomer {
          id
          registeredName
          tradingName
        }
        
        poNumber
        currency
        
        deliveryAddress
        deliveryNote
        warehouseNote
        
        salesTeam
        value
        reserveValue
        shipValue
        backorderValue
        
        dispatchCount
        dispatches
        
        orderQty
        shipQty
        reservedQty
        backOrderQty
        
        documents
        
        details {    
          lineItems {
            id
            line
            productCode
            productDescription
            
            price
            totalPrice
            unitOfMeasure
            
            orderQty
            shippedQty                              
            reservedQty
            backOrderQty
            
            comment 
            
            product {
              id
              image
            }
          }
          comments {
            comment
          }
        }
      }
    }`,
    variables: {
      'formData.orderId': 'sales_order_id',
    },
    resultType: 'object',
    resultMap: {
      'orderDate': 'header.orderDate',
      'customer': 'header.client',
      'crmCustomer.tradingName': 'header.customer',
      'currency': 'header.currency',

      'deliveryAddress': 'deliveryDetails.deliveryAddress',
      'deliveryNote': 'deliveryDetails.deliveryNote',
      'warehouseNote': 'deliveryDetails.warehouseNote',
      
      'iso': 'orderSummary.orderId',
      'orderType': 'orderSummary.orderType',
      'poNumber': 'orderSummary.poNumber',
      'salesTeam': 'orderSummary.salesPerson',
      'quoteId': 'orderSummary.quoteNumber',
      
      'documents': 'documents',

      'details.lineItems': 'lineItems',
      
      'details.comments': 'comments',
    },
    // autoQuery: true,
    edit: false,
    new: false,
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
  }
};

export default graphql;
