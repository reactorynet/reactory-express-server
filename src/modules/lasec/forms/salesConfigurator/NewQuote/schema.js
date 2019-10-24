export default {
  type: 'object',
  title: 'New Quote',
  properties: {
    client: {
      title: 'Client',
      type: 'string',
    },
    date: {
      title: 'Date',
      type: 'string'
    },
    poNumber: {
      title: 'PO Number',
      type: 'string'
    }
  }
};
