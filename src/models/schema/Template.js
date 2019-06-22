/* eslint-disable max-len */
import mongoose from 'mongoose';
import * as lodash from 'lodash';
import logger from '../../logging';


const { ObjectId } = mongoose.Schema.Types;
const TemplateSchema = mongoose.Schema({
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

// eslint-disable-next-line max-len
TemplateSchema.statics.findClientTemplate = function findClientTemplate(template, organization, client) {
  const qry = { view: template.view, client: client._id }; // eslint-disable-line no-underscore-dangle
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
export default TemplateModel;
