import Reactory from '@reactorynet/reactory-core';

export default async (
  form: Reactory.Forms.IReactoryForm,
  args: any, 
  context: Reactory.Server.IReactoryContext, 
  info: any): Promise<Reactory.Schema.AnySchema> => {
  
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
  };

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
        description: "Slug must be a unique, well-formed URL style label (e.g. 'about-reactory')"
      },
      title: {
        type: 'string',
        title: 'Title',
        description: 'Display title for the content'
      },
      description: {
        type: 'string',
        title: 'Description / Excerpt',
        description: 'Short summary or overview of the content'
      },
      content: {
        type: 'string',
        title: 'Content Body',
        description: 'Main content in HTML or Markdown format'
      },
      version: {
        type: 'string',
        title: 'Version',
        default: '1.0.0'
      },
      locale: {
        type: 'string',
        title: 'Locale / Language',
        default: 'en'
      },
      langKey: {
        type: 'string',
        title: 'Language Iso Code'
      },
      topics: {
        type: 'array',
        title: 'Tags / Topics',
        items: {
          type: 'string',
          title: 'Topic'
        }
      },
      published: {
        type: 'boolean',
        title: 'Published State',
        default: true
      },
      template: {
        type: 'boolean',
        title: 'Is Dynamic Template',
        default: false
      },
      engine: {
        type: 'string',
        title: 'Template Engine',
        enum: ['lodash', 'none', 'handlebars'],
        default: 'lodash'
      },
      previewInputForm: {
        type: 'string',
        title: 'Preview Input Form FQN',
        description: 'Optional form FQN used for generating mock preview data'
      },
      helpTopic: {
        type: 'string',
        title: 'Help Topic Key'
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
        description: 'Scheduled or applied publish timestamp'
      },
      authorisations: authorisationSchema,
      author: authorSchema
    }
  };

  return schema;
}
