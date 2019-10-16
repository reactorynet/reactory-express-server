export default {
  type: 'object',
  title: 'About Us',
  properties: {
    pageTitle: {
      type: 'string',
      title: 'Title'
    },
    created: {
      type: 'string',
      format: 'datetime'
    },
    content: {
      type: 'string',
      title: 'Content'
    }
  }  
};