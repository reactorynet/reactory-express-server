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
        title: 'Slug'
      },
      title: {
        type: 'string',
        title: 'Title'
      },
      langKey: {
        type: 'string',
        title: 'Language Iso Code'
      },
      createdAt: {
        type: 'string',
        format: 'datetime'
      },
      updatedAt: {
        type: 'string',
        format: 'datetime'
      },
      publishDate: {
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
      },
      authorisations: authorisationSchema,
      author: authorSchema
    }
  };

  return schema;
}
