/* eslint-disable max-len */
import mongoose, { MongooseDocument } from 'mongoose';
import * as lodash from 'lodash';
import { readFileSync, existsSync } from 'fs';
import logger from '../../logging';
import Reactory from '@reactory/reactory-core';
import { RecordNotFoundError } from 'exceptions';
import { Template } from 'models';


const { ObjectId } = mongoose.Schema.Types;

const {
  APP_DATA_ROOT,
} = process.env;

const TemplateSchema = new mongoose.Schema({
  id: ObjectId,
  client: {
    type: ObjectId,
    required: true,
    ref: 'ReactoryClient',
  },
  organization: {
    type: ObjectId,
    required: false,
    ref: 'Organization',
  },
  businessUnit: {
    type: ObjectId,
    required: false,
    ref: 'BusinessUnit',
  },
  user: {
    type: ObjectId,
    required: false,
    ref: 'User',
  },
  visibility: {
    type: String,
    lowercase: true,
    trim: true,
    enum: ['user', 'public', 'businessUnit', 'organization', 'client'],
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  view: {
    type: String,
    trim: true,
    lowercase: true,
  },
  locale: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'en',
  },
  kind: {
    type: String,
    lowercase: true,
    trim: true,
    enum: ['email', 'widget', 'page', 'css', 'layout', 'content', 'pdf', 'source', 'svg'],
    default: 'email',
  },
  format: {
    type: String,
    lowercase: true,
    trim: true,
    enum: ['html', 'text', 'wrapper', 'image'],
    default: 'html',
  },
  original: String,
  content: {
    type: String,
    required: false,
  },
  props: {},
  elements: [{
    type: ObjectId,
    ref: 'Template',
  }],
  keys: {
    type: Map,
    of: String,
  },
  created: {
    type: Date,
    required: false,
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: false,
  },
  updated: {
    type: Date,
    required: false,
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User',
    required: false,
  },
  parameters: [{
    name: String,
    propType: String,
  }],
});

TemplateSchema.post('init', function (template: any) {
  template.content = template.contentFromFile()
})


TemplateSchema.methods.contentFromFile = function (templateType: string) {
  if (`${this.content}`.indexOf('$ref://') >= 0) {
    logger.debug(`${this._id} has FILE reference, loading.`)
    this.original = this.content;
    const filename = `${APP_DATA_ROOT}/templates/${templateType || 'email'}/${this.content.replace('$ref://', '')}`;
    logger.info(`Loading template filename: ${filename}`);
    if (existsSync(filename) === true) {
      let templateString = readFileSync(filename).toString('utf8');
      try {
        templateString = templateString.replaceAll("&lt;%=", "<%=").replaceAll("%&gt;", "%>");
        templateString = templateString.replaceAll("%3C%=", "<%=").replaceAll("%%3E", "%>");
        return templateString;

      } catch (renderErr) {
        logger.error('::TEMPLATE RENDER ERROR::', { templateString, renderErr });
        return `::TEMPLATE RENDER ERROR::${renderErr.message}`;
      }
    } else {
      return `::TEMPLATE RENDER ERROR::${filename} NOT FOUND`
    }
  }

  return this.content;
}

// eslint-disable-next-line max-len
TemplateSchema.statics.findClientTemplate = function findClientTemplate(template: Reactory.ITemplate, organization: Reactory.IOrganizationDocument, client: Reactory.IPartner) {
  const qry = { view: template.view, client: client._id, organization: null as Reactory.IOrganization }; // eslint-disable-line no-underscore-dangle
  if (organization && organization._id) qry.organization = organization._id; // eslint-disable-line no-underscore-dangle
  return this.findOne(qry).then();
};

TemplateSchema.statics.templates = async (client: any, organization: any = null) => {
  const { isNil } = lodash;
  logger.info('Listing templates using search criteria', client, organization);
  if (isNil(client) === false && ObjectId.isValid(client)) {
    if (isNil(organization) === false && ObjectId.isValid(organization) === true) {
      return this.find({
        client: ObjectId(client),
        organization: ObjectId(organization),
      }).then();
    }

    return this.find({
      client: ObjectId(client),
    }).then();
  }
  // use default partner tempaltes
  return [];
};

const TemplateModel = mongoose.model('Template', TemplateSchema);
export default TemplateModel
