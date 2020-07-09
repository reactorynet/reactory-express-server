
import { Reactory } from '@reactory/server-core/types/reactory'

const minmalOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  imageManagerLoadMethod: 'GET',
  toolbarInline: false,
  toolbarVisibleWithoutSelection: false,
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  toolbarButtons: {
    'moreText': {
      'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
    },
    'moreParagraph': {
      'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
    },
  },
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
  },
  quickInsertEnabled: false,
};

const schema: Reactory.ISchema = {
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

const uiSchema: any = {
  'ui:options': {
    containerType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
    showHelp: false,
  },
  title: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  slug: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  createdAt: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      showLabel: false,
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    }
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      showLabel: false,
      froalaOptions: minmalOptions,
    },
  },
  published: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      style: {
        display: 'none',
        maxHeight: '0px',
      }
    },
    readOnly: true,
    hidden: true
  },
  topics: {
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      container: 'core.BasicContainer',
      style: {
        display: 'none',
        maxHeight: '0px',
      },
      containerProps: {
        title: 'Page Tags',
        style: {
          display: "none"
        },
      },
    },
  }

};

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetSaleOrderDocumentBySlug',
    text: `query LasecGetSaleOrderDocumentBySlug($slug: String!) {
      LasecGetSaleOrderDocumentBySlug(slug: $slug){
        id
        slug
        title
        content
        published
        topics
        createdBy {
          id
          fullName
        }
        createdAt
      }
    }`,
    variables: {
      'formData.slug': 'slug',
      '$route.params.slug': 'slug',
    },
    resultMap: {
      id: 'id',
      'createdAt': 'createdAt',
      'title': 'title',
      'content': 'content',
      'slug': 'slug',
      'published': 'published',
      'topics': 'topics'
    },
    edit: false,
    new: false,
  },
  mutation: {
    new: {
      name: 'LasecUploadSaleOrderDocument',
      text: `mutation LasecUploadSaleOrderDocument($createInput: SalesOrderContentInput!){
        LasecUploadSaleOrderDocument(createInput: $createInput){
          id
          slug
          title
          content
          topics
          published
          createdBy {
            id
            fullName
          }
          createdAt
        }
      }`,
      objectMap: true,
      updateMessage: 'Uploading document ...',
      variables: {
        'formData.slug': 'createInput.slug',
        'formData.title': 'createInput.title',
        'formData.content': 'createInput.content',
        'formData.published': 'createInput.published',
        'formData.topics': 'createInput.topics'
      },
      onSuccessMethod: 'refresh'
    },
    edit: {
      name: 'ReactoryCreateContent',
      text: `mutation ReactoryCreateContent($createInput: CreateContentInput!){
        ReactoryCreateContent(createInput: $createInput){
          id
          slug
          title
          content
          topics
          published
          createdBy {
            id
            fullName
          }
          createdAt
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating document ...',
      variables: {
        'formData.slug': 'createInput.slug',
        'formData.title': 'createInput.title',
        'formData.content': 'createInput.content',
        'formData.published': 'createInput.published',
        'formData.topics': 'createInput.topics'
      },
      onSuccessMethod: 'refresh'
    },
  },
};

const SalesOrderDocumentUpload: Reactory.IReactoryForm = {
  id: 'SalesOrderDocumentUpload',
  uiFramework: 'material',
  uiSupport: ['material'],
  title: 'Lasec Sales Order Document Upload',
  tags: ['Lasec', 'Sales Order', 'Document Upload'],
  name: 'SalesOrderDocumentUpload',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  registerAsComponent: true,
  schema: schema,
  uiSchema: uiSchema,
  graphql: graphql,
  defaultFormValue: { slug: '' },
};

export default SalesOrderDocumentUpload;
