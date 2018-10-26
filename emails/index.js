import co from 'co';
import { readFileSync, existsSync } from 'fs';
import moment from 'moment';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
// import Email from 'email-templates';
import ejs from 'ejs';
import { isNil } from 'lodash';
import ApiError, { RecordNotFoundError, OrganizationNotFoundError } from '../exceptions';
import { Template, ReactoryClient, EmailQueue } from '../models';
import defaultEmailTemplates from './defaultEmailTemplates';
import AuthConfig from '../authentication';
import logger from '../logging';

const TemplateViews = {
  ActivationEmail: 'activation-email',
  ForgotPassword: 'forgot-password-email',
  WelcomeUser: 'welcome-email',
};

dotenv.config();


const {
  APP_DATA_ROOT,
  LEGACY_APP_DATA_ROOT,
} = process.env;

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
            case `${TemplateViews.ForgotPassword}/subject`: subjectTemplate = templateElement; break;
            case `${TemplateViews.ForgotPassword}/body`: bodyTemplate = templateElement; break;
            case `${TemplateViews.ForgotPassword}/text`: textTemplate = templateElement; break;
            default: break;
          }
        });

        const msg = {
          to: user.email,
          from: partner.email,
          subject: ejs.render(subjectTemplate, properties),
          text: ejs.render(textTemplate, properties),
          html: ejs.render(bodyTemplate, properties),
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

const renderTemplate = (template, properties) => {
  if (template && typeof template.content === 'string') {
    if (template.content.toString().indexOf('$ref://') === 0) {
      const filename = `${APP_DATA_ROOT}/templates/email/${template.content.replace('$ref://', '')}`;
      const templateString = readFileSync(filename).toString('utf8');
      if (existsSync(filename)) {
        try {
          return ejs.render(templateString, properties);
        } catch (renderErr) {
          logger.error('::TEMPLATE RENDER ERROR::', { templateString, renderErr });
          throw renderErr;
        }
      }
      throw new RecordNotFoundError('Filename for template not found', 'TEMPLATE_REF');
    } else {
      return ejs.render(template.content, properties);
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
          to: 'werner.weber+devredirect@gmail.com', // user.email,
          from: partner.email,
        };

        try {
          if (isNil(subjectTemplate) === false) {
            msg.subject = renderTemplate(subjectTemplate, properties);
          }
        } catch (renderError) {
          reject(new ApiError('Error rendering subject', { original: renderError.message }));
        }

        try {
          if (isNil(bodyTemplate) === false) {
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

        if (!isNil(msg.subject) && !isNil(msg.html)) {
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
        reject(new RecordNotFoundError(loadError.message));
      });
    } catch (mailError) {
      reject(new ApiError(mailError.message));
    }
  });
};


const loadEmailTemplate = (view, organization, client, keys = [], templateFormat = 'html') => {
  return new Promise((resolve, reject) => {
    let qry = {
      view,
      client: client._id,
      kind: 'email',
      format: templateFormat,
    };

    if (isNil(organization) === false) {
      qry = { ...qry, organization: organization._id };
    }

    logger.info('Searching for template', qry);

    Template.find(qry)
      .populate('client')
      .populate('organization')
      .populate('elements')
      .then((templates) => {
        if (templates.length >= 1) resolve(templates[0]);
        else reject(new RecordNotFoundError('Could not locate suitable template', 'Template', { keys, client }));
      })
      .catch((templateError) => {
        reject(templateError);
      });
  });
};

/*
const addTemplate = (templateInput) => {
  const template = new Template(templateInput);
  return template;
};

const deleteTemplate = (templateInput ) => {

};

const updateTemplate = (templateInput) => {

};
*/

function* installTemplateGenerator(template, organization, client) {
  const found = yield Template.findClientTemplate(template, organization, client);
  if (isNil(found) === true) {
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
  logger.debug('template already exists');
  return found;
}

// const installTemplate = co.wrap(installTemplateGenerator);

export const installDefaultEmailTemplates = (client) => {
  return new Promise((resolve, reject) => {
    try {
      const promises = defaultEmailTemplates.map((template) => {
        logger.info(`Installing / Updating ${template.view} template into system for client ${client.name}`);
        return installTemplateGenerator(template, undefined, client);
      });
      Promise.all(promises).then(templates => resolve(templates));
    } catch (e) {
      reject(e);
    }
  });
};

export default {
  sendActivationEmail,
  sendForgotPasswordEmail,
  installDefaultEmailTemplates,
};
