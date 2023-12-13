export default {
  type: 'object',
  title: 'About Us',
  properties: {
    slug: {
      type: 'string',
      title: 'Slug'
    },
    title: {
      type: 'string',
      title: 'Title'
    },
    createdAt: {
      type: 'string',
      format: 'datetime'
    },
    content: {
      type: 'string',
      title: 'Content'
    }
  }
};
