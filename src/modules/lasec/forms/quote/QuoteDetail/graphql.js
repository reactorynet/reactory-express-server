import { fileAsString } from '../../../../../utils/io';

export default {
  query: {
    name: 'LasecGetQuoteById',
    text: fileAsString(require.resolve('./LasecGetQuoteById.graphql')),
    variables: {
      //'formData.code': 'quote_id',
      'formContext.quote_id': 'quote_id',
    },    
    resultMap: {
      id: 'id',
      'created': 'created',
      'modified': 'modified',
      'code': ['quote_id', 'code'],
      'statusName': 'statusName',      
      'customer': 'customer',
      'company': 'company',
      'note': 'note',
      'totalVATExclusive': 'totalVATExclusive',
      'totals.totalDiscount': 'totalDiscount',
      'customer.fullName': 'customerName',
      'company.tradingName': 'companyTradingName',
      'timeline': 'timeline',
      'lineItems': 'quoteLineItems',
      'lineItems[].header.text': 'lineItems[].headerText'
    },   
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
};