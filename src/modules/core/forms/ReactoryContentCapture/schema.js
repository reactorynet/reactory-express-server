export default {
  type: 'object',
  title: 'About Us',
  required: ['slug', 'title', 'content'],
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
    },
    topics: {
      type: 'array',
      title: 'Content',
      items: {
        type: 'string',
        title: 'Topic'
      }
    },
    published: {
      type: 'boolean',
      title: 'Published',
    }
  }
};
