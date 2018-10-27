import mongoose from 'mongoose';
import { isNil } from 'lodash';
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
    enum: ['email', 'widget', 'page', 'css', 'layout', 'content'],
    default: 'email',
  },
  format: {
    type: String,
    lowercase: true,
    trim: true,
    enum: ['html', 'text', 'wrapper'],
    default: 'html',
  },
  content: {
    type: String,
    required: false,
  },
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

TemplateSchema.statics.findClientTemplate = function findClientTemplate(template, organization, client) {
  const qry = { view: template.view, client: client._id }; // eslint-disable-line no-underscore-dangle
  if (organization && organization._id) qry.organization = organization._id; // eslint-disable-line no-underscore-dangle
  return this.findOne(qry).then();
};
const TemplateModel = mongoose.model('Template', TemplateSchema);
export default TemplateModel;
