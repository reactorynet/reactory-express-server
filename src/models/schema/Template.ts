/* eslint-disable max-len */
import mongoose, { MongooseDocument } from 'mongoose';
import * as lodash from 'lodash';
import { readFileSync, existsSync } from 'fs';
import logger from '../../logging';
import { Reactory } from 'types/reactory';
import { RecordNotFoundError } from 'exceptions';
import { Template } from 'models';


const { ObjectId } = mongoose.Schema.Types;

const {
  APP_DATA_ROOT,
  //  LEGACY_APP_DATA_ROOT,
} = process.env;

const TemplateSchema = new mongoose.Schema({
  id: ObjectId,
  organization: {
    type: ObjectId,
    required: false,
    ref: 'Organization',
  },
  client: {
    type: ObjectId,
    required: true,
    ref: 'ReactoryClient',
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
    enum: ['email', 'widget', 'page', 'css', 'layout', 'content', 'pdf'],
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
  parameters: [{
    name: String,
    propType: String,
  }],
});

TemplateSchema.post('init', function(template: any){
  template.content = template.contentFromFile()
})


TemplateSchema.methods.contentFromFile = function(templateType: string) {  
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
TemplateSchema.statics.findClientTemplate = function findClientTemplate(template: Reactory.ITemplate, organization: Reactory.IOrganization, client: Reactory.IPartner) {
  const qry = { view: template.view, client: client._id, organization: null as Reactory.IOrganization }; // eslint-disable-line no-underscore-dangle
  if (organization && organization._id) qry.organization = organization._id; // eslint-disable-line no-underscore-dangle
  return this.findOne(qry).then();
};

TemplateSchema.statics.templates = async (client = null, organization = null) => {
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
  return this.find({ client: global.partner._id }).then();
};

const TemplateModel = mongoose.model('Template', TemplateSchema);
export default TemplateModel
