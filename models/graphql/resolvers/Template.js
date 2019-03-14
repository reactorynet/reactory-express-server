import { ObjectId } from 'mongodb';
import { indexOf, remove, isNil } from 'lodash';
import {
  Organization,
  Template,
} from '../../';
import { RecordNotFoundError } from '../../../exceptions';


const TemplateResolvers = {
  Template: {
    id: (template) => { return template._id || null; },
  },
  Query: {
    templates: (obj, { client, organization }) => { return Template.templates(client, organization).then(); },
    template: (obj, { id }) => { return Template.findById(id).then(); },
  },
  Mutation: {
    updateTemplateContent: async (parent, { id, content }) => {
      const template = await Template.findById(id).then();
      if (!template) throw new RecordNotFoundError('Could not locate the template with the id', 'Template');

      return template;
    },
  },
};

export default TemplateResolvers;

module.exports = {
  TemplateResolvers,
};
