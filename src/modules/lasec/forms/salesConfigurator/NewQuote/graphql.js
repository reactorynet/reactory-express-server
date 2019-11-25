import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  query: {
    name: 'LasecGetClientList',
    text: fileAsString(require.resolve('./LasecGetClientList.graphql')),
    resultType: 'array',
    edit: false,
    new: true,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    new: {
      name: 'LasecCreateClientEnquiry',
      text: fileAsString(require.resolve('./LasecCreateClientEnquiry.graphql')),
      objectMap: true,
      updateMessage: 'Creating New Customer Enquiry...',
      variables: {
        'formData.customerId': 'input.customerId',
      },
      onSuccessMethod: 'route',
      onSuccessUrl: '/categorylist/?enquiry_id=${enquiryId}'
    },    
  }
};
