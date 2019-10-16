import { fileAsString } from '../../../../../utils/io';

export default {
  query: {
    name: 'LasecGetQuoteById',
    text: fileAsString(require.resolve('./LasecGetQuotes.graphql')),
    variables: {
      'formData.code': 'quote_id',
    },   
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
};