import { readFileSync, existsSync } from 'fs';
import ejs from 'ejs';
import lodash from 'lodash';
import { Reactory } from '@reactory/server-core/types/reactory';
import { TemplateType } from '@reactory/server-core/types/constants';
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



const extractEmailSections = (template: Reactory.ITemplateDocument): Reactory.IEmailTemplate => {
  const extracted: Reactory.IEmailTemplate = {
    id: template.id || template._id,
    client: template.client,
    businessUnit: template.businessUnit,
    organization: template.organization,
    name: template.name,
    visiblity: template.visiblity,
    description: template.description,
    userId: template.userId,
    view: template.view,
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

  logger.debug(`Extracted Template ${template.name} [${template.view}]`);

  return extracted;
};

export class ReactoryTemplateService implements Reactory.Service.IReactoryTemplateService {

  name: string = 'TemplateService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  executionContext: Reactory.ReactoryExecutionContext;

  constructor(props: any, context: any) {
    this.executionContext = {
      partner: props.partner || context.partner,
      user: props.user || context.partner
    }
  }

  async dehydrateEmail(template: Reactory.IEmailTemplate, context: Reactory.IReactoryContext): Promise<Reactory.ITemplate> {

    const { view, client, organization, businessUnit, userId, id } = template

    logger.debug(`TemplateService.dehydrateEmail id: ${id} view:  ${view}, client ${client}, organization: ${organization}, business unit: ${businessUnit}, user id: ${userId}`);


    try {

      let existingTemplate: Reactory.ITemplateDocument = null;

      if (ObjectID.isValid(id)) {
        existingTemplate = await Template.findById(id).populate('client')
          .populate('organization')
          .populate('elements').then() as Reactory.ITemplateDocument;
        logger.debug('TemplateService fetched template using id', { found: existingTemplate !== null });
      }
      else {
        existingTemplate = await this.getTemplate(view, client, organization, businessUnit, userId).then() as Reactory.ITemplateDocument;
        logger.debug('TemplateService search result', { found: existingTemplate !== null });
      }

      const newTemplateAction = () => {
        logger.debug(`core.TemplateService creating new template ${template.view}`);

        const _template = new Template() as Reactory.ITemplateDocument
        const _subjectTemplate = new Template() as Reactory.ITemplateDocument;
        const _bodyTemplate = new Template() as Reactory.ITemplateDocument;

        _subjectTemplate._id = new ObjectID();

        _subjectTemplate.client = client;
        _subjectTemplate.organization = organization;
        _subjectTemplate.businessUnit = businessUnit;
        _subjectTemplate.userId = userId;

        _subjectTemplate.kind = TemplateType.content;
        _subjectTemplate.view = `${template.view}/subject`
        _subjectTemplate.content = template.subject;
        _subjectTemplate.format = "text"
        _subjectTemplate.enabled = true
        _subjectTemplate.parameters = [];
        _subjectTemplate.elements = [];

        _bodyTemplate._id = new ObjectID();

        _bodyTemplate.client = client;
        _bodyTemplate.organization = organization;
        _bodyTemplate.businessUnit = businessUnit;
        _bodyTemplate.user = userId;

        _bodyTemplate.kind = TemplateType.content
        _bodyTemplate.view = `${template.view}/body`
        _bodyTemplate.format = "html"
        _bodyTemplate.content = template.body;
        _bodyTemplate.enabled = true
        _bodyTemplate.parameters = [];
        _bodyTemplate.elements = [];

        _bodyTemplate.createdBy = context.user._id;
        _bodyTemplate.created = new Date();

        _template._id = new ObjectID();

        _template.client = client;
        _template.organization = organization;
        _template.businessUnit = businessUnit;
        _template.user = userId;

        _template.view = template.view;
        _template.kind = TemplateType.email;
        _template.name = template.name;
        _template.visiblity = template.visiblity;
        _template.enabled = true
        _template.description = template.description;

        _template.createdBy = context.user._id;
        _template.created = new Date();

        _template.elements = [
          _subjectTemplate,
          _bodyTemplate
        ];

        return _template;
      }

      const updateExisting = async () => {
        logger.debug(`core.TemplateService updating template ${template.view}`);

        let subjectSet: boolean = false;
        let bodySet: boolean = false;

        if (lodash.isArray(existingTemplate.elements) === false) existingTemplate.elements = [];

        /**
         * patch content for template
         * @param templateEl 
         */
        const patchContent = async (templateEl: Reactory.ITemplateDocument): Promise<Boolean> => {
          logger.debug(`Patching content for template element`, { templateEl, template });
          try {
            if (templateEl.view.endsWith('/subject')) {
              templateEl.content = template.subject;
              subjectSet = true;
            }

            if (templateEl.view.endsWith('/body')) {
              templateEl.content = template.body;
              bodySet = true;
            }

            templateEl.updated = new Date();
            templateEl.updatedBy = context.user._id

            await templateEl.save().then();

            return true;
          } catch (saveError) {
            logger.error(`Could not save the content`, saveError)
            return false;
          }
        }

        // PATCH ALL ELEMENTS IN TEMPLATE
        await Promise.all(existingTemplate.elements.map(patchContent)).then();

        // IF FAIL CREATE A NEW BODY TEMPLATE AND ADD TO TEMPLATE
        if (bodySet === false) {
          const _bodyTemplate = new Template() as Reactory.ITemplateDocument;;
          _bodyTemplate._id = new ObjectID();

          _bodyTemplate.client = client;
          _bodyTemplate.organization = organization
          _bodyTemplate.businessUnit = businessUnit
          _bodyTemplate.user = userId

          _bodyTemplate.kind = TemplateType.content
          _bodyTemplate.view = `${template.view}/body`
          _bodyTemplate.format = "html"
          _bodyTemplate.enabled = true
          _bodyTemplate.visiblity = template.visiblity;
          _bodyTemplate.parameters = [];
          _bodyTemplate.elements = [];

          existingTemplate.elements.push(_bodyTemplate)
        }

        // IF FAIL CREATE A NEW SUBJECT TEMPLATE AND ADD TO TEMPLATE
        if (subjectSet === false) {

          const _subjectTemplate = new Template() as Reactory.ITemplateDocument;
          _subjectTemplate._id = new ObjectID();

          _subjectTemplate.client = client;
          _subjectTemplate.organization = organization
          _subjectTemplate.businessUnit = businessUnit
          _subjectTemplate.user = userId

          _subjectTemplate.kind = TemplateType.content;
          _subjectTemplate.organization = organization
          _subjectTemplate.view = `${template.view}/subject`
          _subjectTemplate.format = "text"
          _subjectTemplate.enabled = true
          _subjectTemplate.parameters = [];
          _subjectTemplate.elements = [];
          _subjectTemplate.visiblity = template.visiblity;

          existingTemplate.elements.push(_subjectTemplate)
        }

        existingTemplate.name = template.name;
        existingTemplate.visiblity = template.visiblity;
        existingTemplate.description = template.description;
        existingTemplate.kind = TemplateType.email;


        return existingTemplate;
      }


      if (existingTemplate === null || existingTemplate === undefined) {
        //null item, zero match
        return newTemplateAction();
      }

      //most specific to least specific logic decision.
      if (userId !== null && userId.equals(existingTemplate.user)) return await updateExisting();
      if (userId !== null && userId.equals(existingTemplate.user) === false) return newTemplateAction();

      if (businessUnit !== null && businessUnit.equals(existingTemplate.businessUnit)) return await updateExisting();
      if (businessUnit !== null && businessUnit.equals(existingTemplate.businessUnit) === false) return newTemplateAction();

      if (organization !== null && organization.equals(existingTemplate.organization)) return await updateExisting();
      if (organization !== null && organization.equals(existingTemplate.organization) === false) return newTemplateAction();

      if (client !== null && client.equals(existingTemplate.client)) return await updateExisting();
      if (client !== null && client.equals(existingTemplate.client) === false) return newTemplateAction();

      logger.debug(`Descision tree should have returned, executing default newTemplateAction`)
      return newTemplateAction();

    } catch (dehydrateError) {
      logger.error(`TemplateService.dehydrateEmail() => error ${dehydrateError.message}`);
      throw dehydrateError
    }
  }

  hydrateEmail(template: Reactory.ITemplate | Reactory.ITemplateDocument): Promise<Reactory.IEmailTemplate> {
    if (template === null) Promise.reject(`template may not be null`);

    return Promise.resolve(extractEmailSections(template as Reactory.ITemplateDocument));
  }

  renderTemplate(template: any | String | Reactory.ITemplate, properties: any): string {

    if (typeof template === 'string') {

      logger.debug(`Template Before render:\n-------\n${template}\n------\n`)

      let templateString = (template as String).replaceAll("&lt;%=", "<%=").replaceAll("%&gt;", "%>");
      templateString = templateString.replaceAll("%3C%=", "<%=").replaceAll("%%3E", "%>");

      const compiled = ejs.render(templateString, properties);

      logger.debug(`Template After render:\n-------\n${compiled}\n------\n`)

      return compiled;

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


  async getTemplate(view: string, reactoryClientId: string | ObjectID, organizationId: string | ObjectID, businessUnitId?: string | ObjectID, userId?: string | ObjectID, context: Reactory.IReactoryContext): Promise<Reactory.ITemplate> {

    logger.debug(`TemplateService.ts.getTemplate()`, { view, reactoryClientId, organizationId, businessUnitId, userId });

    if (view === null || view === undefined) throw new ApiError('parameter: "view" may not be null or undefined', { source: 'core.services.TemplateService.ts' });
    if (view && view.length < 5) throw new ApiError('parameter: "view" should at least be 5 characters long', { source: 'core.services.TemplateService.ts' });

    //set base filter
    let conditions: { [key: string]: any } = {
      view: view
    };

    let search_type = 'default';

    if (ObjectID.isValid(reactoryClientId) === true) conditions.client = new ObjectID(reactoryClientId)
    else conditions.client = context.partner._id;

    if (ObjectID.isValid(organizationId) === true) conditions.organization = new ObjectID(organizationId);
    else conditions.organization = null;

    if (ObjectID.isValid(businessUnitId) === true) conditions.businessUnit = new ObjectID(businessUnitId);
    else conditions.businessUnit = null;

    if (ObjectID.isValid(userId) === true) conditions.user = new ObjectID(userId);
    else conditions.user = null;

    // the base query should return one result 
    let template: Reactory.ITemplateDocument = await Template.findOne({ filter: conditions })
      .populate('client')
      .populate('organization')
      .populate('elements')
      .then();
    let templates: Reactory.ITemplateDocument[] = [];
    // if we do not find a template we check if we have a user filter.  If there is a user even a null value
    // we drop the user filter 
    if (template === null && conditions.user) {
      logger.debug(`🟠 [core.TemplateService] Could not locate the template link to the user, trying without organisation`)
      delete conditions.user;
      search_type = 'organisation / public';
      conditions.visibility = { $in: ['organization', 'public', null] };
      templates = await Template.find(conditions)
        .populate('client')
        .populate('organization')
        .populate('elements').then();
      if (templates.length > 0) {
        //take the first one - means it matches for client id and organization id (which could be null)
        template = templates[0];
      }
    }

    if (template === null && conditions.organization) {
      logger.debug(`🟠 [core.TemplateService] Could not locate the template link to the organiisation, trying without organisation`)
      delete conditions.organization;
      conditions.visibility = { $in: ['client', 'public', null] };
      search_type = 'application / public';
      templates = await Template.find(conditions).populate('client')
        .populate('organization')
        .populate('elements').then();
      if (templates.length > 0) {
        //take the first one - means it matches for client id and organization id (which could be null)
        template = templates[0];
      }

    }

    if (template === null && conditions.client) {
      logger.debug(`🟠 [core.TemplateService] Could not locate the template trying with view name only`)
      delete conditions.client;
      conditions.visibility = { $in: ['public', null] };
      search_type = 'public';
      templates = await Template.find(conditions).populate('client')
        .populate('organization')
        .populate('elements').then();
      if (templates.length > 0) {
        //take the first one - means it matches for client id and organization id (which could be null)
        template = templates[0];
      }
    }

    if (template === null) logger.warn('🟠 No template found matching the search criteria', { reactoryClientId, organizationId, businessUnitId, userId });
    else logger.debug(`🟢 Template available using ${search_type} search`);

    return template;

  }

  async setTemplate(view: string, template: Reactory.ITemplateDocument, reactoryClientId?: string | ObjectID, organizationId?: string | ObjectID, businessUnitId?: string | ObjectID, userId?: string | ObjectID, context: Reactory.IReactoryContext): Promise<Reactory.ITemplate> {

    let filter: { [key: string]: any } = {
      view
    };

    let $clientId: ObjectID;
    let $organizationId: ObjectID;
    let $businessUnitId: ObjectID;
    let $userId: ObjectID;

    $clientId = ObjectID.isValid(reactoryClientId) === true ? new ObjectID(reactoryClientId) : context.partner._id; //force the partner id on the template.  better practice to not have global global templates.
    $organizationId = ObjectID.isValid(organizationId) === true ? new ObjectID(organizationId) : null;
    $businessUnitId = ObjectID.isValid(businessUnitId) === true ? new ObjectID(businessUnitId) : null;
    $userId = ObjectID.isValid(userId) === true ? new ObjectID(userId) : null;

    filter.client = $clientId;
    filter.organization = $organizationId;
    filter.businessUnit = $businessUnitId;
    filter.user = $userId;

    //used for normalized filter elements representing client (tenant), organization, business unit and user.
    let $template_props: any = {}

    $template_props.client = $clientId;
    $template_props.organization = $organizationId;
    $template_props.businessUnit = $businessUnitId;
    $template_props.user = $userId;

    let $template: Reactory.ITemplateDocument = await Template.findOne({ filter }).then();
    //match exact with the filter on set.  Don't do any smart fall backs and global updates.

    if ($template === null) {
      $template = new Template({ ...template, $template_props }) as Reactory.ITemplateDocument;
    } else {
      $template.content = template.content;
      $template.enabled = template.enabled || $template.enabled;
      $template.locale = template.locale || $template.locale;
      $template.kind = template.kind || $template.kind;
      $template.format = template.format || $template.format;
      $template.view = template.view || $template.view;
      $template.businessUnit = $template_props.businessUnit;
      $template.organization = $template_props.organization;
      $template.user = $template_props.userId;
      $template.client = $template_props.client;
    }

    await $template.save().then()

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
    logger.debug(`[core.ReactoryTemplateService].onStartup() 🟢`)
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