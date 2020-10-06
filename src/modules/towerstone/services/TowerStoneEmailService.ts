import lodash, { isNil } from 'lodash';
import logger from 'logging';
import * as dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import ReactoryMail from '@reactory/server-core/emails';
import AuthConfig from '@reactory/server-core/authentication';
import { ObjectId } from 'mongodb'
import { Template, EmailQueue } from '@reactory/server-core/models';
import { TowerStone } from '../towerstone';
import { FormNameSpace } from '../constants';
import { TemplateType } from '@reactory/server-core/types/constants';
import ApiError, { RecordNotFoundError } from 'exceptions';
import { Reactory } from '@reactory/server-core/types/reactory';

import moment from 'moment';
import { IEmailQueueDocument } from 'models/schema/EmailQueue';


const EmailDefaults: Array<TowerStone.ISurveyEmailTemplate> = [
  // general templates
  // these are mapped from the const TemplateView in src/emails/index.js
  // these will replace the old mappings over time as we improve this module.
  {
    id: 'towerstone.peer-invite-email',
    key: 'towerstone.peer-invite-email',
    surveyType: '$general', //hijacking survey type field used as special filter
    activity: 'peer-nomination',
    target: 'nominee',
    subject: 'You have been nominated by <%=employee.firstName%>',
    body: `No Template`,
    engine: 'ejs',
    description: `Sent to a nominated peer, when a user confirms their peers or when the administrator confirms their peers on their behalf.`,
  },
  // 180 assessment types
  {
    id: ``,
    key: ``,
    surveyType: '180',
    activity: 'invite',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180',
    activity: 'invite',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180',
    activity: 'launch',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180',
    activity: 'launch',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180',
    activity: 'reminder',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180',
    activity: 'reminder',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },

  // plc types

  {
    id: ``,
    key: ``,
    surveyType: 'plc',
    activity: 'invite',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs',
    description: 'Sent to a delegate when the administrator sends the invitation to participate',
  },
  {
    id: ``,
    key: ``,
    surveyType: 'plc',
    activity: 'launch',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'plc',
    activity: 'launch',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'plc',
    activity: 'reminder',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'plc',
    activity: 'reminder',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },

  //360 email types
  {
    id: ``,
    key: ``,
    surveyType: '360',
    activity: 'invite',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '360',
    activity: 'invite',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '360',
    activity: 'launch',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '360',
    activity: 'launch',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '360',
    activity: 'reminder',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '360',
    activity: 'reminder',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },


  /**
   * Mores types added here
   */

   // team180 assessment types
 /*
   {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'invite',
    target: 'assessor',
    subject: 'Invitation: Team 180° Leadership assessment between ${survey.delegateTeamName} and ${survey.delegateTeamName}',
    body: `No Template`,
    engine: 'ejs'
  },


  {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'invite',
    target: 'delegate',
    subject: 'Invitation: Team 180° Leadership assessment between ${survey.delegateTeamName} and ${survey.assessorTeamName}',
    body: `No Template`,
    engine: 'ejs'
  },

*/

  {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'launch',
    target: 'assessor',
    subject: 'Launch: Team 180° Leadership assessment between ${survey.delegateTeamName} and ${survey.delegateTeamName}',
    body: `This message will be setn to the assessor team member(s)`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'launch',
    target: 'delegate',
    subject: 'Launch: Team 180° Leadership assessment between ${survey.delegateTeamName} and ${survey.delegateTeamName}',
    body: `This message will be sent to the delegate team member(s)`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'reminder',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'reminder',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },

  {
    id: ``,
    key: ``,
    surveyType: 'team180',
    activity: 'survey-closed',
    target: 'delegate',
    subject: '<%=survey.title%> is now closed. Thank you for your participation',
    body: `This is the mail sent to the delegates with a thank you note.`,
    engine: 'ejs'
  },

  // culture survey types
  /*
  {
    id: ``,
    key: ``,
    surveyType: 'culture',
    activity: 'invite',
    target: 'delegate',
    subject: 'Invitation: <%=survey.organization.name%> Culture Survey',
    body: `Invite: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs',
    description: 'Sent to a delegate when the administrator sends the invitation to participate',
  },

  {
    id: ``,
    key: ``,
    surveyType: 'culture',
    activity: 'launch',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  */
  {
    id: ``,
    key: ``,
    surveyType: 'culture',
    activity: 'launch',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'culture',
    activity: 'reminder',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  /*
  {
    id: ``,
    key: ``,
    surveyType: 'culture',
    activity: 'reminder',
    target: 'assessor',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },
  */
  {
    id: ``,
    key: ``,
    surveyType: 'culture',
    activity: 'survey-closed',
    target: 'delegate',
    subject: 'No Subject',
    body: `No Template`,
    engine: 'ejs'
  },

  //i360 email types

  {
    id: ``,
    key: ``,
    surveyType: 'i360',
    activity: 'invite',
    target: 'delegate',
    subject: 'Invite: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Invite: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'i360',
    activity: 'launch',
    target: 'assessor',
    subject: 'Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'i360',
    activity: 'launch',
    target: 'delegate',
    subject: 'Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'i360',
    activity: 'reminder',
    target: 'delegate',
    subject: 'Reminder: Individual 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Reminder: Individual 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'i360',
    activity: 'reminder',
    target: 'assessor',
    subject: 'Reminder: Individual 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Reminder: Individual 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },

  {
    id: ``,
    key: ``,
    surveyType: 'i360',
    activity: 'survey-closed',
    target: 'delegate',
    subject: '<%=survey.title%> is now closed. Thank you for your participation',
    body: `This is the mail sent to the delegate with their PDF report when the assessment ends.`,
    engine: 'ejs'
  },

  //template types for leadership 360

  /*
  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'invite',
    target: 'assessor',
    subject: '*** NOT SENT ***',
    body: `No Template`,
    engine: 'ejs'
  },
  */
  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'invite',
    target: 'delegate',
    subject: 'Invite: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Invite: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'launch',
    target: 'assessor',
    subject: 'Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'launch',
    target: 'delegate',
    subject: 'Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Launch: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'reminder',
    target: 'delegate',
    subject: 'Reminder: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Reminder: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'reminder',
    target: 'assessor',
    subject: 'Reminder: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>',
    body: `Reminder: Leadership 360° assessment for <%=delegate.firstName%> <%=delegate.lastName%>`,
    engine: 'ejs'
  },

  {
    id: ``,
    key: ``,
    surveyType: 'l360',
    activity: 'survey-closed',
    target: 'delegate',
    subject: '<%=survey.title%> is now closed. Thank you for your participation',
    body: `This is the mail sent to the delegate with their PDF report when the assessment ends.`,
    engine: 'ejs'
  },

]

const DefaultQueueOptions: any = {
  sent: false,
  sentAt: null,
  sendVia: 'sendgrid',
  sendKey: '',
  sendAfter: moment(),
  error: '',
  failures: 0,
  survey: null,
  archived: false,
  createdAt: moment(),
  client: null,
};




const queueMail = async (user: Reactory.IUserDocument, msg: any, options = DefaultQueueOptions) => {
  const {
    sent = false,
    sentAt = null,
    sendAfter = moment(),
    error = '',
    failures = 0,
    archived = false,
    createdAt = moment(),
    survey = null,
    client = null,
  } = { ...DefaultQueueOptions, ...options };

  const {
    from,
    to,
    subject,
    html,
  } = msg;

  const emailQueueInput = {
    sendAfter,
    sentAt,
    sent,
    error,
    failures,
    from,
    message: html,
    subject,
    to,
    archived,
    createdAt,
    format: 'html',
    user: user._id,
    survey: isNil(survey) ? null : survey._id,
    client: isNil(client) ? global.partner._id : client._id,
  };

  try {
    const emailQueue = new EmailQueue(emailQueueInput) as IEmailQueueDocument;
    await emailQueue.save().then()
  } catch (newError) {
    logger.error('::Error creating new Email Queue::', newError);
    throw newError;
  }
};


const keyForTemplate = (template: TowerStone.ISurveyEmailTemplate) : string => {
  return `${FormNameSpace}-${template.surveyType}-${template.target}-${template.activity}`;
};

const getTowerStoneSurveyEmailTemplate = (surveyType: string,  activity: string, target:string) : TowerStone.ISurveyEmailTemplate => {

  const _template = lodash.find(EmailDefaults, { surveyType, activity, target });
  if(_template) {
    _template.id = keyForTemplate(_template);
    _template.key = _template.id;
  }

  return _template;
};

const hydrateContent = async (template: TowerStone.ISurveyEmailTemplate, survey: TowerStone.ISurveyDocument) => {
  const _template = template;
  const existing = await getReactoryTemplate(template.key, survey.organization, global.partner).then() as Reactory.ITemplateDocument
  if(existing === null) return _template
  if(existing._id && existing.elements) {
    existing.elements.forEach((element: Reactory.ITemplate) => {
      if(element.view.endsWith("/subject")) {
        _template.subject = element.content;
      }

      if(element.view.endsWith("/body")) {

        _template.body = element.content;
      }
    })
  }
  return _template;
};

/**
 * Function to load an email template from the Reactory Templates
 * @param view
 * @param organization
 * @param client
 * @param keys
 * @param templateFormat
 */
const getReactoryTemplate = async (view: string, organization: Reactory.IOrganization, client: Reactory.IPartner, keys: string[] = [], templateFormat: string = 'html') => {
  let qry = {
    view,
    client: new ObjectId(client._id),
    kind: 'email',
    format: templateFormat,
    organization: null as ObjectId
  };

  if (isNil(organization) === false) {
    qry = { ...qry, organization: organization._id };
  }

  logger.info('Searching for template', qry);

  let templateDocument = await Template.findOne(qry)
    .populate('client')
    .populate('organization')
    .populate('elements')
    .then();

  if (lodash.isNil(templateDocument) === true) {
    logger.info(`No document(s) found using query ${JSON.stringify(qry, null, 2)}`);
    if (organization) {
      delete qry.organization;

      templateDocument = await Template.findOne(qry)
        .populate('client')
        .populate('elements')
        .then();

      if (lodash.isNil(templateDocument) === true) {
        logger.info(`Again no document(s) found using query ${JSON.stringify(qry, null, 2)} getting without org or client`);
        delete qry.client;

        templateDocument = await Template.findOne(qry)
          .populate('elements')
          .then();
      }
    }
  }

  return templateDocument;
};


/**
 * Function used to patch a survey template
 * @param template
 * @param organization
 * @param client
 */
const patchTemplate = async ( template: TowerStone.ISurveyEmailTemplate, organization: Reactory.IOrganization, client: Reactory.IPartner = global.partner ) => {

  logger.debug(`PATCH TEMPLATE:: ${template.key} : ORG ${JSON.stringify(organization)} : CLIENT ${JSON.stringify(client._id)}`);

  const existingTemplate = await getReactoryTemplate(template.key, organization, client).then() as Reactory.ITemplateDocument;

  if(existingTemplate === null || existingTemplate === undefined || existingTemplate.organization == null || existingTemplate.organization._id.toString() != organization.toString()) {

    logger.debug(`CAREATING NEW:: ${template.key}`);

    const _template = new Template() as Reactory.ITemplateDocument
    const _subjectTemplate = new Template()  as Reactory.ITemplateDocument;
    const _bodyTemplate = new Template()  as Reactory.ITemplateDocument;

    _subjectTemplate._id = new ObjectId();
    _subjectTemplate.client = client._id;
    _subjectTemplate.kind = TemplateType.content;
    _subjectTemplate.organization = organization._id
    _subjectTemplate.view = `${template.key}/subject`
    _subjectTemplate.content = template.subject;
    _subjectTemplate.format = "text"
    _subjectTemplate.enabled = true
    _subjectTemplate.parameters = [
      {
        name: 'partner',
        type: 'Reactory.IPartner'
      },
      {
        name: 'user',
        type: 'Reactory.IUser'
      }
    ];
    _subjectTemplate.elements = [];
    await _subjectTemplate.save().then();

    _bodyTemplate._id = new ObjectId();
    _bodyTemplate.client = client._id;
    _bodyTemplate.organization = organization._id
    _bodyTemplate.kind = TemplateType.content
    _bodyTemplate.view = `${template.key}/body`
    _bodyTemplate.format = "html"
    _bodyTemplate.content = template.body;
    _bodyTemplate.enabled = true
    _bodyTemplate.parameters = [
      {
        name: 'partner',
        type: 'Reactory.IPartner'
      },
      {
        name: 'user',
        type: 'Reactory.IUser'
      }
    ];
    _bodyTemplate.elements = [];
    await _bodyTemplate.save().then();

    _template._id = new ObjectId();
    _template.client = client._id;
    _template.organization = organization._id;
    _template.view = template.key
    _template.kind = TemplateType.email
    _template.elements = [
      _subjectTemplate,
      _bodyTemplate
    ]

    await _template.save().then();
    return _template;
  } else {

    logger.debug(`UPDATING EXISTING:: ${template.key}`);

    let subjectSet: boolean = false;
    let bodySet: boolean = false;

    if(lodash.isArray(existingTemplate.elements) === false) existingTemplate.elements = [];

    const patchContent = async (templateEl: Reactory.ITemplateDocument): Promise<Boolean>  => {
      // logger.debug(`Patching content`, {templateEl, template});
      try {
        if(templateEl.view.endsWith('/subject')) {
          templateEl.content = template.subject;
          await templateEl.save().then();
          subjectSet = true;
        }

        if(templateEl.view.endsWith('/body')) {
          templateEl.content = template.body;
          await templateEl.save().then();
          bodySet = true;
        }

        await templateEl.save().then();
        return true;
      }catch(saveError) {
        logger.error(`Could not save the content`, saveError)
        return false;
      }
    }

    // PATCH ALL ELEMENTS IN TEMPLATE
    await Promise.all(existingTemplate.elements.map(patchContent)).then();

    // IF FAIL CREATE A NEW BODY TEMPLATE AND ADD TO TEMPLATE
    if(bodySet === false) {
      const _bodyTemplate = new Template()  as Reactory.ITemplateDocument;;
      _bodyTemplate._id = new ObjectId();
      _bodyTemplate.client = client._id;
      _bodyTemplate.organization = organization._id
      _bodyTemplate.kind = TemplateType.email
      _bodyTemplate.view = `${template.key}/body`
      _bodyTemplate.format = "html"
      _bodyTemplate.enabled = true
      _bodyTemplate.parameters = [
        {
          name: 'partner',
          type: 'Reactory.IPartner'
        },
        {
          name: 'user',
          type: 'Reactory.IUser'
        }
      ];
      _bodyTemplate.elements = [];
      await _bodyTemplate.save().then();
      existingTemplate.elements.push(_bodyTemplate)
      await existingTemplate.save().then()
    }

    // IF FAIL CREATE A NEW SUBJECT TEMPLATE AND ADD TO TEMPLATE
    if(subjectSet === false) {

      const _subjectTemplate = new Template()  as Reactory.ITemplateDocument;

      _subjectTemplate._id = new ObjectId();
      _subjectTemplate.client = client._id;
      _subjectTemplate.kind = TemplateType.email;
      _subjectTemplate.organization = organization._id
      _subjectTemplate.view = `${template.key}/subject`
      _subjectTemplate.format = "text"
      _subjectTemplate.enabled = true
      _subjectTemplate.parameters = [
        {
          name: 'partner',
          type: 'Reactory.IPartner'
        },
        {
          name: 'user',
          type: 'Reactory.IUser'
        }
      ];
      _subjectTemplate.elements = [];
      await _subjectTemplate.save().then();
      existingTemplate.elements.push(_subjectTemplate)
      await existingTemplate.save().then()
    }

    return existingTemplate;
  }
};

interface TemplateSections {
  subject: string
  body: string
}

const extractSubjectAndBody = (template: Reactory.ITemplateDocument) : TemplateSections  => {
  const extracted : TemplateSections = {
    subject: '',
    body: ''
  };

  if (lodash.isNil(template.elements) === false && lodash.isArray(template.elements) === true) {
      template.elements.forEach((templateElement) => {
      logger.info(`Checking template element view: ${templateElement.view}`);
      if(templateElement.view.endsWith('/subject')) extracted.subject = templateElement.content;
      if(templateElement.view.endsWith('/body')) extracted.body = templateElement.content;
    });
  }

  logger.debug('Extracted Subject and Body', extracted);
  return extracted;
};

/**
 * EmailServiceProvider implementation
 * @param props
 * @param context
 */
const getEmailService = (props: TowerStone.ITowerStoneServiceParameters, context: any): TowerStone.ITowerStoneEmailService =>  {
  logger.debug("TowerStoneEmailService Constructor");
  return {
    send: async (survey: TowerStone.ISurveyDocument, activity: string, target: string, users: Reactory.IUser[], properties: any = {} ) => {
      logger.debug(`Sending email for Survey ${survey.title} for ${activity} action targeting ${target} with ${users.length} user(s)`);
      //if(survey.surveyType === '180' || survey.surveyType === 'plc') {
        const surveyTemplate = getTowerStoneSurveyEmailTemplate(survey.surveyType, activity, target);
        const _template = await getReactoryTemplate(surveyTemplate.key, survey.organization, partner);

        if(lodash.isNil(_template) === true) {
          throw new RecordNotFoundError(`Template with view name ${surveyTemplate.key} could not be loaded`);
        }

        const _subjectAndBody = extractSubjectAndBody(_template as Reactory.ITemplateDocument);

        if(lodash.isEmpty(_subjectAndBody.body)) throw new ApiError(`Could not extract body from template, please ensure ${surveyTemplate.key}/body exists`);
        if(lodash.isEmpty(_subjectAndBody.subject)) throw new ApiError(`Could not extract body from template, please ensure ${surveyTemplate.key}/subject exists`);

        // setup api key for email being sent
        logger.debug('Setting up sgMail')
        try {
          sgMail.setApiKey(partner.emailApiKey);
        } catch (sgError) {
          logger.error('Error setting API key', sgError);
        }

        logger.debug('Api Key Set, configuring property bag for template.');
        // property bag for template
        const baseProperties = {
          partner,
          user, //this be global users
          organization: survey.organization,
          survey,
          applicationTitle: partner.name,
          timeEnd: moment(survey.endDate).format('HH:mm'),
          dateEnd: moment(survey.endDate).format('YYYY-MM-DD'),
          ...properties
        };

        users.map((_user: Reactory.IUserDocument) => {
          const msg = {
            to: `${_user.firstName} ${_user.lastName}<${_user.email}>`,
            from: `${partner.name}<${partner.email}>`,
            ...ReactoryMail.resolveUserEmailAddress(_user, partner),
            subject: '',
            html: ''
          };

          try {
            msg.subject = ReactoryMail.renderTemplate({ content: _subjectAndBody.subject }, { ...baseProperties, user: _user });
          } catch (subjectRenderError) {
            msg.subject = 'Subject Render Error';
          }

          try {
            msg.html = ReactoryMail.renderTemplate({content: _subjectAndBody.body }, { ...baseProperties, user: _user });
          } catch (bodyRenderError) {
            msg.html = `Could not render body due to error ${bodyRenderError}`
          }

          const queoptions = {
            sent: true,
            sentAt: moment().valueOf(),
            client: partner,
            failures: 0,
            error: null as string
          };

          if (isNil(msg.subject) === false && isNil(msg.html) === false) {
            try {
              const emailResult = {
                sent: false,
                error: null as string,
              };

              sgMail.send(msg);
              emailResult.sent = true;
              logger.info(`Email sent to ${msg.to}`);
            } catch (sendError) {
              logger.error(`::ERROR SENDING MAIL:: ${msg.subject}`, msg);
              queoptions.sent = false;
              queoptions.sentAt = null;
              queoptions.failures = 1;
              queoptions.error = sendError.message;
            }
            queueMail(_user, msg, queoptions);
          }
        });

        return {
          errors: [],
          failed: 0,
          sent: 0
        };
      //} else {
      //  throw new ApiError('Not support yet here');
      //}
    },
    templates: async (survey: TowerStone.ISurveyDocument) => {
      logger.debug(`Fetching email templates for ${survey.title} via service ref`);

      const result: TowerStone.ISurveyTemplates = {
        assessorTemplates: [],
        delegateTemplates: [],
        generalTemplates: [],
      };

      result.assessorTemplates = lodash.filter(EmailDefaults, (email) => {
        return email.surveyType === survey.surveyType && email.target === 'assessor';
      }).map((template) => {
        template.id = `${FormNameSpace}-${template.surveyType}-${template.target}-${template.activity}`;
        template.key = `${FormNameSpace}-${template.surveyType}-${template.target}-${template.activity}`;
        return template;
      });

      result.delegateTemplates = lodash.filter(EmailDefaults, (email) => {
        return email.surveyType ===  survey.surveyType && email.target === 'delegate';
      }).map((template) => {
        template.id = `${FormNameSpace}-${template.surveyType}-${template.target}-${template.activity}`;
        template.key = `${FormNameSpace}-${template.surveyType}-${template.target}-${template.activity}`;
        return template;
      });

      result.generalTemplates = lodash.filter(EmailDefaults, (email) => {
        return email.surveyType === '$general';
      });

      result.assessorTemplates = await Promise.all(result.assessorTemplates.map((template) => {
        return hydrateContent(template, survey);
      })).then();

      result.delegateTemplates = await Promise.all(result.delegateTemplates.map((template) => {
        return hydrateContent(template, survey);
      })).then();

      result.generalTemplates = await Promise.all(result.generalTemplates.map((template) => {
        return hydrateContent(template, survey);
      })).then();

      logger.debug('Hydradted templates', { result });

      return result;
    },
    patchTemplates: async (survey: TowerStone.ISurveyDocument, templates: TowerStone.ISurveyTemplates) => {
      // logger.debug(`Patching email template for survey ${survey.title}`, templates);

      const { partner } = global;
      if(survey.id || survey._id) {
        let assessorTemplatePatchResult = await Promise.all(templates.assessorTemplates.map(
          (template: TowerStone.ISurveyEmailTemplate) => {
            return patchTemplate(template, survey.organization, partner);
          }
        )).then();

        assessorTemplatePatchResult.forEach((patched) => {
          // logger.debug('Result for Template Patch', patched)
        });

        let delegatesTemplatePatchResult = await Promise.all(templates.delegateTemplates.map(
          (template: TowerStone.ISurveyEmailTemplate) => {
            return patchTemplate(template, survey.organization, partner);
          }
        )).then();

        delegatesTemplatePatchResult.forEach((patched) => {
          // logger.debug('Result for Template Patch', patched)
        });

        let generalTemplatePatchResult = await Promise.all(templates.generalTemplates.map(
          (template: TowerStone.ISurveyEmailTemplate) => {
            return patchTemplate(template, survey.organization, partner);
          }
        )).then();

        generalTemplatePatchResult.forEach((patched) => {
          // logger.debug('Result for Template Patch', patched)
        });
      }
      return templates;
    }
  };
};

const TowerstoneEmailServiceProvider: TowerStone.ITowerStoneEmailServiceProvider = getEmailService;

export default TowerstoneEmailServiceProvider;
