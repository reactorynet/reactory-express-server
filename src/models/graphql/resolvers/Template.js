import { ObjectId } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
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
    content: (template) => {
      logger.debug(`Loading Content For Template`)
      if (template && template.content && template.content.toString().indexOf('$ref://') >= 0) {
        const filename = `${APP_DATA_ROOT}/templates/email/${template.content.replace('$ref://', '')}`;
        logger.info(`Loading template filename: ${filename}`);
        let templateString = readFileSync(filename).toString('utf8');
        if (existsSync(filename)) {
          try {
            templateString = templateString.replaceAll("&lt;%=", "<%=").replaceAll("%&gt;", "%>");
            templateString = templateString.replaceAll("%3C%=", "<%=").replaceAll("%%3E", "%>");
            return templateString;
          } catch (renderErr) {
            logger.error('::TEMPLATE RENDER ERROR::', { templateString, renderErr });
            return `::TEMPLATE RENDER ERROR::${renderErr.message}`;
          }
        }
        return `::TEMPLATE RENDER ERROR::File ${filename} is missing`;
      } else {
        return template.content;
      }
    }
  },
  Query: {
    ReactoryTemplates: async (obj, { client = null, organization = null }) => {
      logger.info(`Listing templates using search criteria client id: ${client || 'null'} orgnization: ${organization || 'null'}`);
      if (isNil(client) === false && ObjectId.isValid(client)) {
        logger.debug('Filtering templates by client and organization id');
        if (isNil(organization) === false && ObjectId.isValid(organization) === true) {
          return Template.find({
            client: ObjectId(client),
            organization: ObjectId(organization),
          }).then();
        }

        logger.debug('Filtering templates by client id');
        return Template.find({
          client: ObjectId(client),
        }).then();
      }
      // use default partner tempaltes
      logger.debug(`Returning template list for authenticated partner id ${global.partner._id}`);
      return Template.find({ client: global.partner._id }).then();
    },
    ReactoryTemplate: (obj, { id }) => { return Template.findById(id).then(); },
  },
  Mutation: {
    ReactoryUpdateTemplateContent: async (parent, { id, content }) => {
      const template = await Template.findById(id).then();
      if (!template) throw new RecordNotFoundError('Could not locate the template with the id', 'Template');

      return template;
    },
  },
};

export default TemplateResolvers;
