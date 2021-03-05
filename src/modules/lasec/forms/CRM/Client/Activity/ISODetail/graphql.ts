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

        gpPercentage
        mupPercentage

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
            id
            who {
              id
              firstName
              lastName
              fullName
              avatar
            }
            when
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

      'iso': ['orderSummary.orderId', 'comments.orderId'],
      'orderType': 'orderSummary.orderType',
      'poNumber': 'orderSummary.poNumber',
      'salesTeam': 'orderSummary.salesPerson',
      'quoteId': 'orderSummary.quoteNumber',

      // 'details.lineItems': 'lineItems',

      'gpPercentage': 'lineItems.gp',
      'mupPercentage': 'lineItems.mup',

      'details.comments': 'comments.comments',
    },
    // autoQuery: true,
    edit: false,
    new: false,
    refreshEvents: [],
  },
  queries: {
    documents_list: {
      name: 'LasecGetSalesOrderDocuments',
      text: `query LasecGetSalesOrderDocuments($sales_order_id: String!, $paging: PagingRequest){
              LasecGetSalesOrderDocuments(sales_order_id: $sales_order_id, paging: $paging){
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
                  lastName
                  fullName
                }
              }
            }
          }`,
      variables: {
        'formContext.$formData.id': 'sales_order_id',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'documents': 'data',
      },
      resultType: 'object',
    }
  }
};

export default graphql;
