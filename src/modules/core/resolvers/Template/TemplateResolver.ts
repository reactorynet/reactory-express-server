import { ObjectID, ObjectId } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { indexOf, remove, isNil } from 'lodash';
import logger from '@reactory/server-core/logging';
import {
    Organization,
    Template,
} from '@reactory/server-core/models';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';
import Reactory from '@reactory/reactory-core';

interface ReactorySetEmailTemplateParams {
    emailTemplate: {
        id: string
        name: string
        description: string
        organizationId?: string,
        clientId?: string,
        businessUnitId?: string,
        userId?: string,
        visibility: string
        view: string
        subject: string
        body: string
    }
}


interface ReactoryGetEmailTemplateParams {
    view: string
    clientId: string,
    organizationId?: string
    businessUnitId?: string,
    userId?: string,
}

const {
    APP_DATA_ROOT
} = process.env;

const TemplateResolvers = {
    Template: {
        id: (template: Reactory.ITemplateDocument) => { return template._id || null; },
        content: (template: Reactory.ITemplateDocument) => {
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
        ReactoryTemplates: async (obj, { client = null, organization = null }, context: Reactory.Server.IReactoryContext) => {
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
            logger.debug(`Returning template list for authenticated partner id ${context.partner._id}`);
            return Template.find({ client: context.partner._id }).then();
        },
        ReactoryTemplate: (obj, { id }) => { return Template.findById(id).then(); },

        ReactoryGetEmailTemplate: async (obj: any, params: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.IEmailTemplate> => {

            logger.debug('🟠 Query.ReactoryGetEmailTemplate(parent, params)', { obj, params });

            const templateService: Reactory.Service.IReactoryTemplateService = context.getService('core.TemplateService@1.0.0');

            const { view, clientId, organizationId, businessUnitId, userId } = params;
            const templateObject: Reactory.ITemplateDocument = await templateService.getTemplate(view, clientId, organizationId, businessUnitId, userId).then()

            if (templateObject) {
                return templateService.hydrateEmail(templateObject).then();
            } else {
                return {
                    view: view,
                    id: null,
                    businessUnit: ObjectID.isValid(params.businessUnitId) ? new ObjectID(params.businessUnitId) : null,
                    organization: ObjectID.isValid(params.organizationId) ? new ObjectID(params.organizationId) : null,
                    userId: ObjectID.isValid(params.userId) ? new ObjectID(params.userId) : null,
                    client: ObjectID.isValid(params.clientId) ? new ObjectID(params.clientId) : context.partner._id,
                    visiblity: 'user',
                    subject: 'Your subject line',
                    body: '<p>Enter your email body</p>',
                    description: 'Add a description for this template',
                    name: 'Add a name',
                }
            }
        }
    },
    Mutation: {
        ReactoryUpdateTemplateContent: async (parent, { id, content }) => {
            const template = await Template.findById(id).then();
            if (!template) throw new RecordNotFoundError('Could not locate the template with the id', 'Template');

            return template;
        },

        ReactorySetEmailTemplate: async (parent: any, params: ReactorySetEmailTemplateParams, context: Reactory.Server.IReactoryContext): Promise<Reactory.IEmailTemplate> => {
            const templateService: Reactory.Service.IReactoryTemplateService = context.getService('core.TemplateService@1.0.0');

            logger.debug('🟠 Mutation.ReactorySetEmailTemplate(parent, params)', { parent, params });

            let $emailTemplate: Reactory.IEmailTemplate = {
                id: params.emailTemplate.id,
                body: params.emailTemplate.body,
                client: ObjectID.isValid(params.emailTemplate.clientId) ? new ObjectID(params.emailTemplate.clientId) : context.partner._id,
                subject: params.emailTemplate.subject,
                name: params.emailTemplate.name,
                description: params.emailTemplate.description,
                businessUnit: ObjectID.isValid(params.emailTemplate.businessUnitId) ? new ObjectID(params.emailTemplate.businessUnitId) : null,
                organization: ObjectID.isValid(params.emailTemplate.organizationId) ? new ObjectID(params.emailTemplate.organizationId) : null,
                userId: ObjectID.isValid(params.emailTemplate.userId) ? new ObjectID(params.emailTemplate.userId) : null,
                visiblity: params.emailTemplate.visibility,
                view: params.emailTemplate.view
            };

            try {
                let templateObject: Reactory.ITemplateDocument = await templateService.dehydrateEmail($emailTemplate).then();
                logger.debug(`Template service returned template document ${templateObject.baseModelName} id: ${templateObject.id || templateObject._id}, version: ${templateObject.__v}`)

                if (templateObject) {

                    let validationResult = templateObject.validateSync();

                    if (validationResult && Object.keys(validationResult.errors).length > 0) {
                        throw new ApiError(`Could not save the template due validation error`, validationResult);
                    } else {

                        templateObject.elements.forEach((el: Reactory.ITemplateDocument) => {
                            if (el && el.save) el.save()
                            else {
                                logger.debug(`💥 error with template element.`)
                            }
                        })

                        await templateObject.save().then()

                        let emailTemplate: Reactory.IEmailTemplate = await templateService.hydrateEmail(templateObject);
                        logger.debug(`🟢 Mutation.ReactorySetEmailTemplate(parent, params) - done`, { emailTemplate });
                        return emailTemplate;
                    }
                }

                throw new ApiError('Could not successfully dehydrate email returned an empty template.');

            } catch (dehydrateError) {
                logger.debug(`💥 Error Dehydrating email template. [${dehydrateError}]`);
                throw dehydrateError;
            }
        }

    },
};

export default TemplateResolvers;
