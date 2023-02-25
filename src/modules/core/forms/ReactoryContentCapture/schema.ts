import Reactory from '@reactory/reactory-core';


export default async (
  form: Reactory.Forms.IReactoryForm,
  args: any, 
  context: Reactory.Server.IReactoryContext, 
  info: any): Promise<Reactory.Schema.AnySchema> => {
  
  const { i18n, user } = context;
  
  const authorSchema: Reactory.Schema.ISchema = {
    title: 'Author',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        title: 'Id'
      },
      fullName: {
        type: 'string',
        title: 'Fullname'
      }
    }
  }

  const authorisationSchema: Reactory.Schema.ISchema = {
    type: 'array',
    items: {
      type: 'object',
      title: 'Content Authorisation',
      required: ['partnerId'],
      properties: {
        partnerId: {
          type: 'string',
          title: 'Partner / Application Id'
        },
        organisationId: {
          type: 'string',
          title: 'Organisation Id'
        },
        businessUnitId: {
          type: 'string',
          title: 'Business Unit Id'
        },
        teamId: {
          type: 'string',
          title: 'Team Id'
        },
        roles: {
          type: 'array',
          title: 'Roles',
          items: {
            type: 'string',
            title: 'Role / Expr'
          }
        }
      }
    }
  };

  const schema: Reactory.Schema.ISchema = {
    type: 'object',
    required: ['slug', 'title', 'content'],
    properties: {
      slug: {
        type: 'string',
        title: 'Slug',
        descriprion: 'Slug must be a unique well formed url style label. i.e. \'this-is-a-well-formed-slug\''
      },
      title: {
        type: 'string',
        title: 'Title',
        description: 'A title for the content',
      },
      langKey: {
        type: 'string',
        title: 'Language Iso Code'
      },
      createdAt: {
        type: 'string',
        title: 'Created Date',
        format: 'datetime'
      },
      updatedAt: {
        type: 'string',
        title: 'Updated Date',
        format: 'datetime'
      },
      publishDate: {
        type: 'string',
        title: 'Publish Date',
        format: 'datetime',
        description: 'The publish date you want to apply this content item.'
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
      },
      authorisations: authorisationSchema,
      author: authorSchema
    }
  };

  return schema;
}
