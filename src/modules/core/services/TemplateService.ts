import { readFileSync, existsSync } from 'fs';
import ejs from 'ejs';
import lodash from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';

import { Template, ReactoryClient, EmailQueue, User, Organization } from '@reactory/server-core/models';

import logger from '@reactory/server-core/logging';
import { ObjectID } from 'mongodb';

const {
    APP_DATA_ROOT
} = process.env;

function replaceAll(target: string, search: string, replacement: string): string {
    return target.replace(new RegExp(search, 'g'), replacement);
};



const extractEmailSections = (template: Reactory.ITemplate): Reactory.IEmailTemplate => {
    const extracted: Reactory.IEmailTemplate = {
        subject: '',
        body: '',
        signature: ''
    };

    if (lodash.isNil(template.elements) === false && lodash.isArray(template.elements) === true) {
        template.elements.forEach((templateElement) => {
            logger.debug(`Checking template element view: ${templateElement.view}`);
            if (templateElement.view.endsWith('/subject')) extracted.subject = templateElement.content;
            if (templateElement.view.endsWith('/body')) extracted.body = templateElement.content;
            if (templateElement.view.endsWith('/signature')) extracted.signature = templateElement.content;
        });
    }

    logger.debug('Extracted Template:', extracted);
    
    return extracted;
};


export class ReactoryTemplateService implements Reactory.Service.IReactoryTemplateService {

    name: string = 'TemplateService';
    nameSpace: string = 'core';
    version: string = '1.0.0';

    executionContext: Reactory.ReactoryExecutionContext;

    constructor(props: any, context: any) {
        this.executionContext = {
            partner: props.partner || context.partner || global.partner,
            user: props.user || context.partner || global.user
        }
    }


    hydrateEmail(template: Reactory.ITemplate): Promise<Reactory.IEmailTemplate> {
        if (template === null) Promise.reject(`template may not be null`);        

        return Promise.resolve(extractEmailSections(template));
    }

    renderTemplate(template: any | String | Reactory.ITemplate, properties: any): string {

        if (typeof template === 'string') {
            let templateString = replaceAll(template, "%3C%=", "<%=");
            templateString = replaceAll(templateString, "%%3E", "%>");
        } else {
            if (template && template.content) {
                if (template.content.toString().indexOf('$ref://') >= 0) {
                    const filename = `${APP_DATA_ROOT}/templates/email/${replaceAll(template.content, '$ref://', '')}`;
                    logger.info(`Loading template filename: ${filename}`);
                    let templateString = readFileSync(filename).toString('utf8');
                    if (existsSync(filename)) {
                        try {
                            templateString = replaceAll(replaceAll(templateString, "&lt;%=", "<%="), "%&gt;", "%>");
                            templateString = replaceAll(replaceAll(templateString, "%3C%=", "<%="), "%%3E", "%>");
                            return ejs.render(templateString, properties);
                        } catch (renderErr) {
                            logger.error('::TEMPLATE RENDER ERROR::', { templateString, renderErr });
                            throw renderErr;
                        }
                    }
                    throw new RecordNotFoundError('Filename for template not found', 'TEMPLATE_REF');
                } else {
                    let templateString = template.content.replaceAll("&lt;%=", "<%=").replaceAll("%&gt;", "%>");
                    templateString = templateString.replaceAll("%3C%=", "<%=").replaceAll("%%3E", "%>");
                    return ejs.render(templateString, properties);
                }
            }

            throw new ApiError(`Invalid type for template.content, expected string, but got ${typeof template.content}`);
        }


    };


    async getTemplate(view: string, reactoryClientId: string, organizationId: string): Promise<Reactory.ITemplate> {
        let filter: { [key: string]: any } = {
            view
        };

        if (ObjectID.isValid(reactoryClientId) === true) filter.client = new ObjectID(reactoryClientId)
        else filter.client = (global.partner as Reactory.IReactoryClientDocument)._id;

        if (ObjectID.isValid(organizationId) === true) filter.organization = new ObjectID(organizationId);
        else filter.organization = null;

        let template: Reactory.ITemplateDocument = await Template.find({ filter }).then();

        if (template === null && filter.organization) {
            logger.warning(`[core.TemplateService] Could not locate the template link to the orgisation, trying without organisation`)
            delete filter.organization;

            template = await Template.find({ filter }).then();
        }

        if (template === null && filter.client) {
            logger.warning(`[core.TemplateService] Could not locate the template trying with view name only`)
            delete filter.client;

            template = await Template.find({ filter }).then();
        }


        if (template === null) logger.warn('No template found matching the search criteria')


        return template;

    }

    async setTemplate(view: string, reactoryClientId: string, organizationId: string, template: Reactory.ITemplate): Promise<Reactory.ITemplate> {

        let filter: { [key: string]: any } = {
            view
        };

        if (ObjectID.isValid(reactoryClientId) === true) filter.client = new ObjectID(reactoryClientId)
        else filter.client = (global.partner as Reactory.IReactoryClientDocument)._id;

        if (ObjectID.isValid(organizationId) === true) filter.organization = new ObjectID(organizationId);
        else filter.organization = null;

        let $template: Reactory.ITemplateDocument = await Template.find({ filter }).then();

        if ($template === null) {
            $template = new Template({ ...template }) as Reactory.ITemplateDocument;
            $template.save().then()
        } else {
            $template.content = template.content;
            $template.enabled = template.enabled || $template.enabled;
            $template.locale = template.locale || $template.locale;
            $template.kind = template.kind || $template.kind;
            $template.format = template.format || $template.format;
            $template.view = template.view || $template.view;
        }

        return $template;
    }

    getExecutionContext(): Reactory.ReactoryExecutionContext {
        return this.executionContext;
    }
    setExecutionContext(executionContext: Reactory.ReactoryExecutionContext): boolean {
        this.executionContext = executionContext;

        return true;
    }

    onStartup(): Promise<any> {
        //throw new Error('Method not implemented.');
        logger.debug(`[core.ReactoryTemplateService].onStartup() 🟢`, { executionContext: this.executionContext })
        return Promise.resolve(true);
    }
}


export const TemplateServiceDefinition: Reactory.IReactoryServiceDefinition = {
    id: 'core.TemplateService@1.0.0',
    name: 'Reactory TemplateService',
    description: 'Reactory Default Template Service for rendering ejs templates.',
    dependencies: [],
    serviceType: 'template',
    service: (props: Reactory.IReactoryServiceProps, context: any) => {
        return new ReactoryTemplateService(props, context);
    }
}

export default TemplateServiceDefinition