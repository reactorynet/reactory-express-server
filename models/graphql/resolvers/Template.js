import { ObjectId } from 'mongodb';
import { indexOf, remove, isNil } from 'lodash';
import logger from '../../../logging';
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
    templates: async (obj, { client = null, organization = null }) => {
      logger.info('Listing templates using search criteria', client, organization);
      if (isNil(client) === false && ObjectId.isValid(client)) {
        if (isNil(organization) === false && ObjectId.isValid(organization) === true) {
          return Template.find({
            client: ObjectId(client),
            organization: ObjectId(organization),
          }).then();
        }

        return Template.find({
          client: ObjectId(client),
        }).then();
      }
      // use default partner tempaltes
      return this.find({ client: global.partner._id }).then();
    },
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
