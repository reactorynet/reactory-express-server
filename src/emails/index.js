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
import defaultEmailTemplates from './defaultEmailTemplates';
import AuthConfig from '../authentication';
import logger from '../logging';
import { isArray } from 'util';

const TemplateViews = {
  ActivationEmail: 'activation-email',
  ForgotPassword: 'forgot-password-email',
  WelcomeUser: 'welcome-email',
  SurveyInvite: 'towerstone.survey-invite-email',
  InvitePeers: 'towerstone.peer-invite-email',
  SurveyLaunch: 'towerstone.survey-launch-email',
  SurveyReminder: 'towerstone.survey-reminder-email',
};

dotenv.config();


const {
  APP_DATA_ROOT,
  //  LEGACY_APP_DATA_ROOT,
} = process.env;


/**
 * Return the user email address in the following format:
 * @param {UserModel} user
 * @param {ReactorClient} partner
 */
export const resolveUserEmailAddress = (user, reactoryClient = null) => {
  const { partner } = global;
  const { MODE } = process.env;

  let partnerToUse = partner;

  if (lodash.isNil(reactoryClient) === true) {
    partnerToUse = reactoryClient;
  }

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

const sendActivationEmail = (user) => {
  return new Promise((resolve, reject) => {
    try {
      const { partner } = global;
      loadEmailTemplate(TemplateViews.ActivationEmail, null, partner._id).then((templateResult) => {
        sgMail.setApiKey(partner.emailApiKey);
        const properties = {
          partner,
          user,
          applicationTitle: partner.name,
          activateLink: '',
        };
        let bodyTemplate = null;
        let subjectTemplate = null;
        let textTemplate = null;

        templateResult.elements.forEach((templateElement) => {
          switch (templateElement.view) {
            case `${TemplateViews.ActivationEmail}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.ActivationEmail}/body`: bodyTemplate = templateElement; break;
            case `${TemplateViews.ActivationEmail}/text`: textTemplate = templateElement; break;
            default: break;
          }
        });

        const msg = {
          to: user.email,
          from: partner.email,
          subject: ejs.render(subjectTemplate, properties),
          text: ejs.render(textTemplate, properties),
          html: ejs.render(bodyTemplate, properties),
          ...resolveUserEmailAddress(user, partner),
        };

        sgMail.send(msg);
        resolve({ sent: true });
      }).catch((loadError) => {
        reject(loadError);
      });
    } catch (mailError) {
      reject(mailError);
    }
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

const queueMail = co.wrap(function* queueMail(user, msg, options = DefaultQueueOptions) {
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
    client: isNil(client) ? global.partner._id : client._id,
  };

  try {
    return yield new EmailQueue(emailQueueInput).save();
  } catch (newError) {
    logger.error('::Error creating new Email Queue::', newError);
    throw newError;
  }
});

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

export const renderTemplate = (template, properties) => {
  if (template && typeof template.content === 'string') {
    if (template.content.toString().indexOf('$ref://') === 0) {
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
      templateString = templateString.replaceAll("%3C%=", "<%=").replaceAll("%%3E", "%>")
      return ejs.render(templateString, properties);
    }
  }
  throw new ApiError(`Invalid type for template.content, expected string, but got ${typeof template.content}`);
};

/**
 * @param {*} user
 */
const sendForgotPasswordEmail = (user, organization = null) => {
  return new Promise((resolve, reject) => {
    try {
      const { partner } = global;
      loadEmailTemplate(TemplateViews.ForgotPassword, organization, partner).then((templateResult) => {
        if (lodash.isNil(templateResult)) throw new RecordNotFoundError('Could not find a template matching the search criteria', 'Template', { criteria: { view: TemplateViews.ForgotPassword, organization } });
        logger.info(`Template Found ${templateResult._id}`, templateResult);
        try {
          sgMail.setApiKey(partner.emailApiKey);
        } catch (sgError) {
          logger.error('Error setting API key', sgError);
        }
        const properties = {
          partner,
          user,
          applicationTitle: partner.name,
          resetLink: `${partner.siteUrl}${partner.resetEmailRoute}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(user))}`,
        };

        let bodyTemplate = null;
        let subjectTemplate = null;
        templateResult.elements.forEach((templateElement) => {
          switch (templateElement.view) {
            case `${TemplateViews.ForgotPassword}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.ForgotPassword}/body`: bodyTemplate = templateElement; break;
            default: break;
          }
        });

        const msg = {
          to: `${user.fistName} ${user.lastName}<${user.email}>`,
          from: `${partner.name}<${partner.email}>`,
          ...resolveUserEmailAddress(user, partner),
        };

        try {
          if (lodash.isNil(subjectTemplate) === false) {
            msg.subject = renderTemplate(subjectTemplate, properties);
          }
        } catch (renderError) {
          reject(new ApiError('Error rendering subject', { original: renderError.message }));
        }

        try {
          if (lodash.isNil(bodyTemplate) === false) {
            msg.html = renderTemplate(bodyTemplate, properties);
          }
        } catch (renderError) {
          reject(new ApiError('Error rendering html', { original: renderError.message }));
        }

        const qops = {
          sent: true,
          sentAt: moment().valueOf(),
          client: partner,
        };

        if (!lodash.isNil(msg.subject) && !lodash.isNil(msg.html)) {
          try {
            sgMail.send(msg);
          } catch (sendError) {
            logger.log('::ERROR SENDING MAIL::', msg);
            qops.sent = false;
            qops.sentAt = null;
            qops.failures = 1;
            qops.error = sendError.message;
          }
          queueMail(user, msg, qops);
        }
        resolve({ sent: qops.sent });
      }).catch((loadError) => {
        logger.error(loadError.message, loadError);
        reject(new RecordNotFoundError(loadError.message));
      });
    } catch (mailError) {
      logger.error(mailError.message, mailError);
      reject(new ApiError(mailError.message));
    }
  });
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
        delete qry.client;

        templateDocument = await Template.findOne(qry)
          .populate('elements')
          .then();
      }
    }
  }


  return templateDocument;
};

function* installTemplateGenerator(template, organization, client) {
  try {
    const found = yield Template.findClientTemplate(template, organization, client).then();
    if (!(found && found._id)) {
      logger.info(`Template ${template.view} does not exists, creating`);
      let newTemplate = yield new Template({
        ...template,
        client: client._id,
        organization: isNil(organization) ? null : organization._id,
        elements: [],
      }).save();

      if (template.elements.length > 0) {
        for (let ei = 0; ei < template.elements.length; ei += 1) {
          const newElement = yield installTemplateGenerator(template.elements[ei], organization, client);
          newTemplate.elements.push(newElement._id);
        }
      }

      newTemplate = yield newTemplate.save().then();
      return newTemplate;
    }

    logger.info(`Template ${template.view} exists for context ${client._id} => [organization: ${organization && organization.name ? organization.name : 'no org'}]`);
    return found;
  } catch (installError) {
    logger.error('An error occured installing default templates');
    throw installError;
  }
}

// const installTemplate = co.wrap(installTemplateGenerator);

export const installDefaultEmailTemplates = co.wrap(function* installDefaultEmailTemplatesGenerator(client) {
  try {
    const installedTemplates = [];
    for (let ti = 0; ti < defaultEmailTemplates.length; ti += 1) {
      const installedItem = yield installTemplateGenerator(defaultEmailTemplates[ti], undefined, client);
      installedTemplates.push(installedItem);
    }
    return installedTemplates;
  } catch (e) {
    logger.error('Error installing templates', e);
    throw e;
  }
});

export const surveyEmails = {
  /**
   * Sends initial email to assessor
   */
  launchForDelegate: async (assessor, delegate, survey, assessment, organization = null) => {
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

    try {
      const { partner } = global;
      const templateResult = await loadEmailTemplate(TemplateViews.SurveyLaunch, organization, partner).then();

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
        isSelfAssessment: ObjectId(delegate._id).equals(ObjectId(assessorModel._id)) === true,
        survey,
        applicationTitle: partner.name,
        timeEnd: moment(survey.endDate).format('HH:mm'),
        dateEnd: moment(survey.endDate).format('YYYY-MM-DD'),
        assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(assessorModel, { exp: moment(survey.endDate).valueOf() }))}`,
      };

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${TemplateViews.SurveyLaunch}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.SurveyLaunch}/body`: bodyTemplate = templateElement; break;
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
      emailResult.error = loadError.message;
    }
    return emailResult;
  },
  reminder: async (assessor, delegate, survey, assessment, organization, surveyoptions = null) => {
    // final object item to return
    if (lodash.isNil(assessor)) throw new ApiError('assessor parameter for delegateInvite cannot be null / undefined');
    if (lodash.isNil(survey)) throw new ApiError('survey parameter for delegateInvite cannot be null / undefined');

    let assessorModel = null;
    if (ObjectId.isValid(assessor)) {
      assessorModel = await User.findById(assessor).then();
    } else if (assessor.id || assessor._id) assessorModel = await User.findById(assessor).then();

    if (lodash.isNil(assessorModel)) throw new ApiError('assessor parameter has to be a valid ObjectId');

    const emailResult = {
      sent: false,
      error: null,
    };

    try {
      const { partner } = global;
      const templateResult = await loadEmailTemplate(TemplateViews.SurveyReminder, organization, partner).then();
      if (lodash.isNil(templateResult) === true) {
        logger.info('Template Resulted in NILL record');
        throw new RecordNotFoundError(`Cannot find a template using the input params ${TemplateViews.SurveyReminder} ${organization} ${partner}`);
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
        isSelfAssessment: ObjectId(delegate._id).equals(ObjectId(assessorModel._id)) === true,
        survey,
        applicationTitle: partner.name,
        timeEnd: moment(survey.endDate).format('HH:mm'),
        dateEnd: moment(survey.endDate).format('YYYY-MM-DD'),
        assessmentLink: `${partner.siteUrl}/assess/${assessment._id}?auth_token=${AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(assessorModel, { exp: moment(survey.endDate).valueOf() }))}`,
      };

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${TemplateViews.SurveyReminder}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.SurveyReminder}/body`: bodyTemplate = templateElement; break;
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
          msg.subject = `"${TemplateViews.SurveyReminder}/subject" - template segment is not set/empty`;
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
          msg.html = `"${TemplateViews.SurveyReminder}/body" template segment is not set/empty`;
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
      emailResult.error = loadError.message;
    }
    return emailResult;
  },
  delegateInvite: async (delegate, survey, organization) => {
    // final object item to return
    if (lodash.isNil(delegate)) throw new ApiError('delegate parameter for delegateInvite cannot be null / undefined');
    if (lodash.isNil(survey)) throw new ApiError('survey parameter for delegateInvite cannot be null / undefined');

    const emailResult = {
      sent: false,
      error: null,
    };

    try {
      const { partner } = global;
      const templateResult = await loadEmailTemplate(TemplateViews.SurveyInvite, organization, partner).then();
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
      const authToken = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(delegate, { exp: moment(survey.endDate).valueOf() }));
      const properties = {
        partner,
        delegate,
        survey,
        organization: await Organization.findById(survey.organization).then(),
        applicationTitle: partner.name,
        authToken,
        link: `${partner.siteUrl}/profile/?auth_token=${authToken}&peerconfig=true`,
      };

      let bodyTemplate = null;
      let subjectTemplate = null;
      logger.info('Setting up subject and body elements');
      if (lodash.isNil(templateResult.elements) === false &&
        lodash.isArray(templateResult.elements) === true) {
        templateResult.elements.forEach((templateElement) => {
          logger.info(`Checking template element view: ${templateElement.view}`);
          switch (templateElement.view) {
            case `${TemplateViews.SurveyInvite}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.SurveyInvite}/body`: bodyTemplate = templateElement; break;
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
          msg.subject = `"${TemplateViews.SurveyInvite}/subject" - template segment is not set/empty`;
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
          msg.html = `"${TemplateViews.SurveyInvite}/body" template segment is not set/empty`;
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
      const { partner } = global;
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
      let exp = moment().add(30, 'd').valueOf();

      if (isNil(survey) === false) {
        exp = isNil(survey.endDate) === false ? moment(survey.endDate).valueOf() : exp;
      }

      // property bag for template
      const properties = {
        partner,
        peer,
        nominee: peer,
        user,
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
          logger.info('Rendering body');
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
          if (organigramModel && isArray(organigramModel.peers) === true && peerIndex >= 0) {
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
    delegateEmail = surveyEmails[surveyEmailTask](delegate, survey);
    return delegateEmail;
  });
};

export default {
  sendActivationEmail,
  sendForgotPasswordEmail,
  installDefaultEmailTemplates,
  queueSurveyEmails,
  organigramEmails,
  surveyEmails,
  renderTemplate,
  resolveUserEmailAddress
};
