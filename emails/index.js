import mongoose from 'mongoose';
import { setApiKey, send } from '@sendgrid/mail';
import Email from 'email-templates';
import ejs from 'ejs';
import { isNil } from 'lodash';
import { RecordNotFoundError } from '../exceptions';
import { Template, ReactoryClient } from '../models';
import defaultEmailTemplates from './defaultEmailTemplates';

const TemplateViews = {
  ActivationEmail: 'activation-email',
  ForgotPassword: 'forgot-password-email',
  WelcomeUser: 'welcome-email',
};


const sendActivationEmail = (user) => {
  return new Promise((resolve, reject) => {
    try {
      const { partner } = global;
      loadEmailTemplate(TemplateViews.ActivationEmail, null, partner._id).then((templateResult) => {        
        setApiKey(partner.emailApiKey);
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

        send(msg);
        resolve({ sent: true });
      }).catch((loadError) => {
        reject(loadError);
      });
    } catch (mailError) {
      reject(mailError);
    }
  });
};

/**
 * @param {*} user 
 */
const sendForgotPasswordEmail = (user) => {
  return new Promise((resolve, reject) => {
    try {
      const { partner } = global;
      loadEmailTemplate(TemplateViews.ForgotPassword, null, partner._id).then((templateResult) => {
        setApiKey(partner.emailApiKey);
        const properties = {
          partner,
          user,
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
          to: user.email,
          from: partner.email,
          subject: ejs.render(subjectTemplate, properties),
          html: ejs.render(bodyTemplate, properties),
        };

        send(msg);
        resolve({ sent: true });
      }).catch((loadError) => {
        reject(loadError);
      });
    } catch (mailError) {
      reject(mailError);
    }
  });
};


const loadEmailTemplate = (view, organization, clientId, keys = [], templateFormat = 'html') => {
  return new Promise((resolve, reject) => {
    let qry = {
      view,
      client: clientId,
      kind: 'email',
      format: templateFormat,
    };

    if (isNil(organization) === false) {
      qry = { ...qry, organization: organization.id };
    }

    Template.find(qry)
      .populate('client')
      .populate('organization')
      .populate('elements')
      .then((templates) => {
        if (templates.length >= 1) resolve(templates[0]);
        else reject(new RecordNotFoundError('Could not locate suitable template', 'Template', { keys, clientId }));
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

export const installDefaultEmailTemplates = () => {
  return new Promise((resolve, reject) => {
    try {
      const installed = [];
      defaultEmailTemplates.forEach((template) => {
        ReactoryClient.find({}).then((clients) => {
          clients.forEach((client) => {
            // console.log(`Installing ${template.view} template into system for client ${client._id}`);
            Template.find({ view: template.view, clientId: client._id }).then((findResults) => {
              // console.log(`Template ${template.view} results`, findResults);
              if (findResults.length === 0) {
                const newTemplate = new Template({ ...template, client: client._id, elements: [] });
                for (let ei = 0; ei <= template.elements.length; ei += 1) {
                  const element = new Template({ ...template.elements[ei], client: client._id, elements:[] });
                  element.save().then((elementSaved) => {
                    newTemplate.elements.push(elementSaved._id);
                    newTemplate.save().then();
                  });
                }
                installed.push(newTemplate);
                resolve(installed);
              }
            }).catch((findError) => {
              // console.error('Error finding template', findError);
            });
          });
        });
      });      
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
