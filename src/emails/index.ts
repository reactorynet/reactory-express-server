import co from 'co';
import { ObjectId } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import moment from 'moment';
import * as dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
// import Email from 'email-templates';
import ejs from 'ejs';
import lodash, { isNil } from 'lodash';
import ApiError, { RecordNotFoundError, OrganizationNotFoundError } from '../exceptions';
import { Template, ReactoryClient, EmailQueue, User, Organization } from '../models';
import AuthConfig from '../authentication';
import logger from '../logging';

import Reactory from '@reactorynet/reactory-core';
import { Mores } from '@reactory/server-core/modules/mores/types/mores'

import { SURVEY_EVENTS_TO_TRACK } from '@reactory/server-core/models/index';

/**
 * Legacy core email senders.
 *
 * The transactional senders that used to live in this module -
 * `sendActivationEmail`, `sendForgotPasswordEmail` and
 * `installDefaultEmailTemplates` - were deleted by
 * REACTORY-302016408/20261103/1998880703. They sent through
 * `@sendgrid/mail` directly, bypassing `CommunicatorService` (so no
 * provider selection, audit trail, delivery receipts or error mapping),
 * and they built their own reset / activation links inline, duplicating
 * the normalised builders in
 * `modules/reactory-core/routes/useraccount/UserAccount.ts`.
 *
 * Do not reintroduce a send path here. Transactional email must go
 * through `CommunicatorService` with a template resolved by
 * `resolveEmailTemplate()` in the communicator module's
 * `services/emailTemplates`.
 *
 * The `$ref://` EJS bodies under `src/emails/defaults/**` are still live:
 * the communicator default-template seeding resolves them by path, so
 * that directory must stay even though the senders that first referenced
 * it are gone.
 */

const TemplateViews = {
  ActivationEmail: 'activation-email',
  ForgotPassword: 'forgot-password-email',
  ProductQuery: 'product-query-email',
  WelcomeUser: 'welcome-email',
  SurveyInvite: 'towerstone.survey-invite-email',
  InvitePeers: 'towerstone.peer-invite-email',
  SurveyLaunch: 'towerstone.survey-launch-email',
  SurveyReminder: 'towerstone.survey-reminder-email',
};

dotenv.config();


const {
  APP_DATA_ROOT,
} = process.env;


/**
 * Return the user email address in the following format:
 * @param {UserModel} user
 * @param {ReactorClient} partner
 */
export const resolveUserEmailAddress = (user, reactoryClient) => {
  const { MODE } = process.env;

  const partnerToUse = reactoryClient;

  // check if we have a redirect setting for this mode
  const redirectSetting = partnerToUse.getSetting(`email_redirect/${MODE}`);
  let emailAddress = user.email;
  if (lodash.isNil(redirectSetting) === false && lodash.isNil(redirectSetting.data) === false) {
    const { email, enabled } = redirectSetting.data;
    if (lodash.isNil(email) === false && enabled === true) emailAddress = email;
  }

  logger.info(`Email Address has been resolved as, ${emailAddress}`, { emailAddress, redirectSetting });

  return {
    to: `${user.firstName} ${user.lastName}<${emailAddress}>`,
    from: `${partnerToUse.name}<${partnerToUse.email}>`,
  };
};


const sendProductQueryEmail = async ({ to, from, subject, message }, context) => {
  return new Promise((resolve, reject) => {
    const { partner } = context;
    sgMail.setApiKey(partner.emailApiKey);
    const msg = {
      to,
      from,
      subject,
      html: message
    };

    let response = {
      success: true,
      message: 'Mail sent successfully.'
    }

    try {
      sgMail.send(msg);
    } catch (sendError) {
      logger.log('::ERROR SENDING MAIL::', msg);
      response.success = false;
      response.message = sendError.message;
    }

    resolve(response);
  });
};

const sendSimpleEmail = async ({ to, from, subject, message }, context) => {
  return new Promise((resolve, reject) => {
    const { partner } = context;
    sgMail.setApiKey(partner.emailApiKey);
    const msg = {
      to,
      from,
      subject,
      html: message
    };

    let response = {
      success: true,
      message: 'Mail sent successfully.'
    }

    try {
      sgMail.send(msg);
    } catch (sendError) {
      logger.log('::ERROR SENDING MAIL::', msg);
      response.success = false;
      response.message = sendError.message;
    }

    resolve(response);
  });
};

const DefaultQueueOptions = {
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

const queueMail = async (user, msg, options = DefaultQueueOptions) => {
  const {
    sent,
    sentAt,
    sendAfter,
    error,
    failures,
    archived,
    createdAt,
    survey,
    client,
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
    client: isNil(client) ? context.partner._id : client._id,
  };

  try {
    return await new EmailQueue(emailQueueInput).save().then();
  } catch (newError) {
    logger.error('::Error creating new Email Queue::', newError);
    throw newError;
  }
};

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

export const renderTemplate = (template, properties) => {
  if (template && typeof template.content === 'string') {
    if (template.content.toString().indexOf('$ref://') >= 0) {
      const filename = `${APP_DATA_ROOT}/templates/email/${template.content.replace('$ref://', '')}`;
      logger.info(`Loading template filename: ${filename}`);
      let templateString = readFileSync(filename).toString('utf8');
      if (existsSync(filename)) {
        try {
          templateString = templateString.replaceAll("&lt;%=", "<%=").replaceAll("%&gt;", "%>");
          templateString = templateString.replaceAll("%3C%=", "<%=").replaceAll("%%3E", "%>");
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
};


const loadEmailTemplate = async (view, organization, client, keys = [], templateFormat = 'html') => {

  let qry = {
    view,
    client: ObjectId(client._id),
    kind: 'email',
    format: templateFormat,
  };

  if (isNil(organization) === false) {
    qry = { ...qry, organization: organization._id };
  }

  logger.debug(`finding view: ${view}`);

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
        delete qry.client;

        templateDocument = await Template.findOne(qry)
          .populate('elements')
          .then();
      }
    }
  }

  return templateDocument;
};

export const surveyEmails = {
  /**
   * Sends initial email to assessor
   */
  launchForDelegate: async (assessor: Reactory.IUserDocument, delegate: Reactory.IUserDocument, survey: Mores.ISurveyDocument, assessment: Mores.IAssessmentDocument, organization: Reactory.IOrganizationDocument = null, context: Reactoy.IReactoryContext) => {
    // final object item to return
    logger.info(`Sending email to assessor ${assessor}`, assessor);
    if (lodash.isNil(assessor)) throw new ApiError('assessor parameter for launchForDelegate cannot be null / undefined');
    if (lodash.isNil(delegate)) throw new ApiError('delegate parameter for launchForDelegate cannot be null / undefined');
    if (lodash.isNil(survey)) throw new ApiError('survey parameter for launchForDelegate cannot be null / undefined');
    if (lodash.isNil(assessment)) throw new ApiError('assessment parameter for launchForDelegate cannot be null / undefined');

    let assessorModel = null;
    if (ObjectId.isValid(assessor)) {
      assessorModel = await User.findById(assessor).then();
    } else if (assessor.id || assessor._id) assessorModel = assessor;

    if (lodash.isNil(assessorModel)) throw new ApiError('assessor parameter has to be a valid ObjectId');

    const emailResult = {
      sent: false,
      error: null,
    };

    const isSelfAssessment = ObjectId(delegate._id).equals(ObjectId(assessorModel._id)) === true;
    // TODO: this should be changed by changing all the keys for the emails on the 360s
    // mail template
    const viewName = `towerstone-${survey.surveyType}-${isSelfAssessment === true ? 'delegate' : 'assessor'}-launch`;

    let templateResult = null;

    try {
      templateResult = await loadEmailTemplate(viewName, organization, context.partner).then();
    } catch (e) {
      context.log(`Error getting template result for view ${viewName}`)
    }

    try {
      const { partner } = context;
      

      if (lodash.isNil(templateResult) === true) {
        logger.info('Template Resulted in NILL record');
        throw new RecordNotFoundError(`Cannot find a template using the input params ${TemplateViews.SurveyLaunch} ${organization} ${partner}`);
      }
      logger.info('Template loaded, setting up email and client.');

      // setup api key for email being sent
      try {
        sgMail.setApiKey(partner.emailApiKey);
      } catch (sgError) {
        logger.error('Error setting API key', sgError);
      }

      logger.info('Api Key Set, configuring property bag for template.');
      // property bag for template
      const properties = {
        partner,
        assessor: assessorModel,
        delegate,
        assessment,
        user: assessorModel,
        organization: organization || survey.organization,
        isSelfAssessment,
        survey,
        applicationTitle: partner.name,
        timeEnd: moment(survey.endDate).format('HH:mm'),
        dateEnd: moment(survey.endDate).format('YYYY-MM-DD'),
        assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(assessorModel, { exp: moment(survey.endDate).add(60, 'days').valueOf() }))}`,
        link: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(assessorModel, { exp: moment(survey.endDate).add(60, 'days').valueOf() }))}`,
      };

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${viewName}/subject`: subjectTemplate = templateElement; break;
            case `${viewName}/body`: bodyTemplate = templateElement; break;
            default: break;
          }
        });
      } else {
        logger.info('No elements for template');
      }


      const msg = {
        to: `${assessorModel.firstName} ${assessorModel.lastName}<${assessorModel.email}>`,
        from: `${properties.applicationTitle}<${partner.email}>`,
        ...resolveUserEmailAddress(assessorModel, partner),
      };

      // load and set subject
      try {
        if (lodash.isNil(subjectTemplate) === false) {
          logger.info(`Rendering subject ${JSON.stringify(subjectTemplate)}`);
          msg.subject = renderTemplate(subjectTemplate, properties);
        } else {
          msg.subject = `"${TemplateViews.SurveyLaunch}/subject" - template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the subject ${renderError.message}`, renderError);
        msg.subject = 'An error occured getting the subject for this email.';
        // throw new ApiError('Error rendering subject', { original: renderError.message });
      }

      // load and set body
      try {
        if (lodash.isNil(bodyTemplate) === false) {
          logger.info('Rendering body');
          msg.html = renderTemplate(bodyTemplate, properties);
        } else {
          msg.html = `"${TemplateViews.SurveyLaunch}/body" template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the body ${renderError.message}`, renderError);
        // throw new ApiError('Error rendering html', { original: renderError.message });
        msg.body = `The following error occured rendering the body for this email:\n\n${renderError.message}`;
      }

      const queoptions = {
        sent: true,
        sentAt: moment().valueOf(),
        client: partner,
      };

      logger.info(`Email configured, sending ${msg.subject} to ${msg.to} from ${msg.from}`);

      if (isNil(msg.subject) === false && isNil(msg.html) === false) {
        try {
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
        queueMail(assessorModel, msg, queoptions);
      }
    } catch (loadError) {
      context.log('Error occured during email sending');
      emailResult.error = loadError.message;
    }
    return emailResult;
  },
  reminder: async (assessor, delegate, survey, assessment, organization, surveyoptions = null, context) => {
    // final object item to return
    if (lodash.isNil(assessor)) throw new ApiError('assessor parameter for delegateInvite cannot be null / undefined');
    if (lodash.isNil(survey)) throw new ApiError('survey parameter for delegateInvite cannot be null / undefined');
    logger.debug(`Sending Reminder Email ${assessor.fullName()} [${assessment._id} ]`)

    let assessorModel = null;
    if (ObjectId.isValid(assessor) === true) {
      assessorModel = await User.findById(assessor).then();
    } else {
      if (!assessor.firstName || !assessor.lastName || !assessor.email) {
        if (ObjectId.isValid(assessor.id) || ObjectId.isValid(assessor._id))
          assessorModel = await User.findById(assessor._id).then();
      } else {
        assessorModel = assessor;
      }
    }

    const emailResult = {
      sent: false,
      error: null,
    };

    if (assessorModel === true) {
      throw new ApiError('assessor parameter has to be a valid ObjectId or valid assessor document');
    }


    try {
      const { partner } = context;
      let isSelfAssessment = ObjectId(delegate._id).equals(ObjectId(assessorModel._id)) === true;
      //TODO: this should be changed by changing all the keys for the emails on the 360s
      //mail template
      let viewName = `towerstone-${survey.surveyType}-${isSelfAssessment === true ? 'delegate' : 'assessor'}-reminder`;
      const templateResult = await loadEmailTemplate(viewName, organization, partner).then();
      if (lodash.isNil(templateResult) === true) {
        logger.info('Template Resulted in NILL record');
        throw new RecordNotFoundError(`Cannot find a template using the input params ${viewName} ${organization} ${partner}`);
      }
      logger.info('Template loaded, setting up email and client.');

      // setup api key for email being sent
      try {
        sgMail.setApiKey(partner.emailApiKey);
      } catch (sgError) {
        logger.error('Error setting API key', sgError);
      }

      logger.info('Api Key Set, configuring property bag for template.');

      // property bag for template
      const properties = {
        partner,
        assessor: assessorModel,
        delegate,
        assessment,
        user: assessorModel,
        organization: organization || survey.organization,
        isSelfAssessment,
        survey,
        applicationTitle: partner.name,
        timeEnd: moment(survey.endDate).format('HH:mm'),
        dateEnd: moment(survey.endDate).format('YYYY-MM-DD'),
        assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(assessorModel, { exp: moment(survey.endDate).add(60, 'days').valueOf() }))}`,
        link: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(assessorModel, { exp: moment(survey.endDate).add(60, 'days').valueOf() }))}`,
      };

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${viewName}/subject`: subjectTemplate = templateElement; break;
            case `${viewName}/body`: bodyTemplate = templateElement; break;
            default: break;
          }
        });
      } else {
        logger.info('No elements for template');
      }

      const msg = {
        to: `${assessorModel.firstName} ${assessorModel.lastName}<${assessorModel.email}>`,
        from: `${properties.applicationTitle}<${partner.email}>`,
        ...resolveUserEmailAddress(assessorModel, partner),
      };

      // load and set subject
      try {
        if (lodash.isNil(subjectTemplate) === false) {
          logger.info(`Rendering subject ${JSON.stringify(subjectTemplate)}`);
          msg.subject = renderTemplate(subjectTemplate, properties);
        } else {
          msg.subject = `"${viewName}/subject" - template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the subject ${renderError.message}`, renderError);
        msg.subject = 'An error occured getting the subject for this email.';
        // throw new ApiError('Error rendering subject', { original: renderError.message });
      }

      // load and set body
      try {
        if (lodash.isNil(bodyTemplate) === false) {
          logger.info('Rendering body');
          msg.html = renderTemplate(bodyTemplate, properties);
        } else {
          msg.html = `"${viewName}/body" template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the body ${renderError.message}`, renderError);
        // throw new ApiError('Error rendering html', { original: renderError.message });
        msg.body = `The following error occured rendering the body for this email:\n\n${renderError.message}`;
      }

      const queoptions = {
        sent: true,
        sentAt: moment().valueOf(),
        client: partner,
      };

      logger.info(`Email configured, sending ${msg.subject} to ${msg.to} from ${msg.from}`);

      if (isNil(msg.subject) === false && isNil(msg.html) === false) {
        try {
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
        queueMail(assessor, msg, queoptions);
      }
    } catch (loadError) {
      emailResult.error = `MAIN TRY ${loadError.message}`;
    }
    return emailResult;
  },
  delegateInvite: async (delegate, survey, organization, context) => {
    // final object item to return
    if (lodash.isNil(delegate)) throw new ApiError('delegate parameter for delegateInvite cannot be null / undefined');
    if (lodash.isNil(survey)) throw new ApiError('survey parameter for delegateInvite cannot be null / undefined');

    const emailResult = {
      sent: false,
      error: null,
    };

    try {
      const { partner } = context;
      let viewName = `towerstone-${survey.surveyType}-delegate-invite`;
      const templateResult = await loadEmailTemplate(viewName, organization, partner).then();
      if (lodash.isNil(templateResult) === true) {
        logger.info('Template Resulted in NILL record');
        throw new RecordNotFoundError(`Cannot find a template using the input params ${TemplateViews.SurveyInvite} ${organization} ${partner}`);
      }
      logger.info('Template loaded, setting up email and client.');

      // setup api key for email being sent
      try {
        sgMail.setApiKey(partner.emailApiKey);
      } catch (sgError) {
        logger.error('Error setting API key', sgError);
      }

      logger.info('Api Key Set, configuring property bag for template.');
      // property bag for template
      // we generate the auth token and set the expiry

      const $organization = await Organization.findById(survey.organization).then();

      const authToken = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(delegate, { exp: moment(survey.endDate).add(60, 'days').valueOf() }));
      const properties = {
        partner,
        delegate,
        survey,
        organization: $organization,
        applicationTitle: partner.name,
        authToken,
        link: `${partner.siteUrl}/profile/?auth_token=${authToken}&peerconfig=true&organization_id=${$organization._id}&survey_id=${survey._id}`,
      };

      if (survey.options) {
        if (survey.options.autoLaunchOnPeerConfirm === true) {
          properties.link = `${properties.link}&loc=1`;
        }
      }

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${viewName}/subject`: subjectTemplate = templateElement; break;
            case `${viewName}/body`: bodyTemplate = templateElement; break;
            default: break;
          }
        });
      } else {
        logger.info('No elements for template');
      }


      const msg = {
        to: `${delegate.firstName} ${delegate.lastName}<${delegate.email}>`,
        from: `${properties.applicationTitle}<${partner.email}>`,
        ...resolveUserEmailAddress(delegate, partner),
      };

      // load and set subject
      try {
        if (lodash.isNil(subjectTemplate) === false) {
          logger.info(`Rendering subject ${JSON.stringify(subjectTemplate)}`);
          msg.subject = renderTemplate(subjectTemplate, properties);
        } else {
          msg.subject = `"${viewName}/subject" - template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the subject ${renderError.message}`, renderError);
        msg.subject = 'An error occured getting the subject for this email.';
        // throw new ApiError('Error rendering subject', { original: renderError.message });
      }

      // load and set body
      try {
        if (lodash.isNil(bodyTemplate) === false) {
          logger.info('Rendering body');
          msg.html = renderTemplate(bodyTemplate, properties);
        } else {
          msg.html = `"${viewName}/body" template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the body ${renderError.message}`, renderError);
        // throw new ApiError('Error rendering html', { original: renderError.message });
        msg.body = `The following error occured rendering the body for this email:\n\n${renderError.message}`;
      }

      const queoptions = {
        sent: true,
        sentAt: moment().valueOf(),
        client: partner,
      };

      logger.info(`Email configured, sending ${msg.subject} to ${msg.to} from ${msg.from}`);

      if (isNil(msg.subject) === false && isNil(msg.html) === false) {
        try {
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
        queueMail(delegate, msg, queoptions);
      }
    } catch (loadError) {
      emailResult.error = loadError.message;
    }
    return emailResult;
  },
};

export const organigramEmails = {
  confirmedAsPeer: async (peer, user, relationShip, organization = null, organigramModel = null, peerIndex = -1, survey = null) => {
    // final object item to return
    if (lodash.isNil(peer)) throw new ApiError('peer parameter for confirmedAsPeer cannot be null / undefined');
    if (lodash.isNil(user)) throw new ApiError('user parameter for confirmedAsPeer cannot be null / undefined');

    const emailResult = {
      sent: false,
      error: null,
    };

    try {
      const { partner } = context;
      const templateResult = await loadEmailTemplate(TemplateViews.InvitePeers, organization, partner).then();
      if (lodash.isNil(templateResult) === true) {
        logger.info('Template Resulted in NILL record');
        throw new RecordNotFoundError(`Cannot find a template using the input params ${TemplateViews.InvitePeers} ${organization} ${partner}`);
      }
      logger.info('Template loaded, setting up email and client.');

      // setup api key for email being sent
      try {
        sgMail.setApiKey(partner.emailApiKey);
      } catch (sgError) {
        logger.error('Error setting API key', sgError);
      }

      logger.info('Api Key Set, configuring property bag for template.');
      let exp = moment().add(60, 'd').valueOf();

      if (isNil(survey) === false) {
        exp = isNil(survey.endDate) === false ? moment(survey.endDate).valueOf() : exp;
      }

      // property bag for template
      const properties = {
        partner,
        peer,
        nominee: peer,
        user,
        survey,
        employee: user,
        applicationTitle: partner.name,
        relationShip,
        organization,
        profileLink: `${partner.siteUrl}/profile/?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(user, { exp }))}`,
      };

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${TemplateViews.InvitePeers}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.InvitePeers}/body`: bodyTemplate = templateElement; break;
            default: break;
          }
        });
      } else {
        logger.info('No elements for template');
      }


      const msg = {
        to: `${peer.firstName} ${peer.lastName}<${peer.email}>`,
        from: `${properties.applicationTitle}<${partner.email}>`,
        ...resolveUserEmailAddress(peer, partner),
      };

      // load and set subject
      try {
        if (lodash.isNil(subjectTemplate) === false) {
          logger.info(`Rendering subject ${JSON.stringify(subjectTemplate)}`);
          msg.subject = renderTemplate(subjectTemplate, properties);
        } else {
          msg.subject = `"${TemplateViews.InvitePeers}/subject" - template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the subject ${renderError.message}`, renderError);
        msg.subject = 'An error occured getting the subject for this email.';
        // throw new ApiError('Error rendering subject', { original: renderError.message });
      }

      // load and set body
      try {
        if (lodash.isNil(bodyTemplate) === false) {
          logger.info(`Rendering body ${JSON.stringify(bodyTemplate)}`);
          msg.html = renderTemplate(bodyTemplate, properties);
        } else {
          msg.html = `"${TemplateViews.InvitePeers}/body" template segment is not set/empty`;
        }
      } catch (renderError) {
        logger.error(`An error occured rendering the body ${renderError.message}`, renderError);
        // throw new ApiError('Error rendering html', { original: renderError.message });
        msg.body = `The following error occured rendering the body for this email:\n\n${renderError.message}`;
      }

      const queoptions = {
        sent: true,
        sentAt: moment().valueOf(),
        client: partner,
      };

      logger.info(`Email configured, sending ${msg.subject} to ${msg.to} from ${msg.from}`);

      if (isNil(msg.subject) === false && isNil(msg.html) === false) {
        try {
          sgMail.send(msg);
          emailResult.sent = true;
          logger.info(`Email sent to ${msg.to}`);


          if (survey) {
            survey.addTimelineEntry(SURVEY_EVENTS_TO_TRACK.NOMINEE_INVITE, `Nominee invite sent to ${peer.firstName} ${peer.lastName} @ ${moment().format('DD MMM YYYY HH:mm')}.`, null, true);
          }

          if (organigramModel && lodash.isArray(organigramModel.peers) === true && peerIndex >= 0) {
            organigramModel.peers[peerIndex].inviteSent = true; //eslint-disable-line
            organigramModel.peers[peerIndex].confirmed = true; //eslint-disable-line
            organigramModel.peers[peerIndex].confirmedAt = new Date().valueOf(); //eslint-disable-line
            await organigramModel.save().then();
          }
        } catch (sendError) {
          logger.error(`::ERROR SENDING MAIL:: ${msg.subject}`, msg);
          queoptions.sent = false;
          queoptions.sentAt = null;
          queoptions.failures = 1;
          queoptions.error = sendError.message;
        }
        queueMail(user, msg, queoptions);
      }
    } catch (loadError) {
      emailResult.error = loadError.message;
    }
    return emailResult;
  },
};

export const queueSurveyEmails = (survey, surveyEmailTask = 'delegateInvites') => {
  const emails = survey.delegates.map((delegate) => {
    let delegateEmail = surveyEmails[surveyEmailTask](delegate, survey);
    return delegateEmail;
  });
};

export default {
  sendProductQueryEmail,
  sendSimpleEmail,
  queueSurveyEmails,
  organigramEmails,
  surveyEmails,
  renderTemplate,
  resolveUserEmailAddress,
};
