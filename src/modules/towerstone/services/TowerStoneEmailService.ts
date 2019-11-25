import lodash, { isNil } from 'lodash';
import logger from 'logging';
import { ObjectId } from 'mongodb'
import { Template } from '@reactory/server-core/models';
import { Reactory } from '@reactory/server-core/types/reactory';

import { TowerStone } from '../towerstone';
import { FormNameSpace } from '../constants';


const EmailDefaults: Array<TowerStone.ISurveyEmailTemplate> = [
  {
    id: ``,
    key: ``, 
    surveyType: '180', 
    activity: 'invite', 
    target: 'assessor',
    subject: '',
    body: '',
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180', 
    activity: 'invite', 
    target: 'delegate',
    subject: '',
    body: '',
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180', 
    activity: 'launch', 
    target: 'assessor',
    subject: '',
    body: '',
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180', 
    activity: 'launch', 
    target: 'delegate',
    subject: '',
    body: '',
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180', 
    activity: 'reminder', 
    target: 'delegate',
    subject: '',
    body: '',
    engine: 'ejs'
  },
  {
    id: ``,
    key: ``,
    surveyType: '180', 
    activity: 'reminder', 
    target: 'assessor',
    subject: '',
    body: '',
    engine: 'ejs'
  }
]

const loadEmailTemplate = async (view: string, organization: Reactory.IOrganization, client: Reactory.IPartner, keys: string[] = [], templateFormat: string = 'html') => {
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
        delete qry.client;

        templateDocument = await Template.findOne(qry)
          .populate('elements')
          .then();
      }
    }
  }


  return templateDocument;
};

const patchTemplate = async ( template: TowerStone.ISurveyEmailTemplate, organization: Reactory.IOrganization, client: Reactory.IPartner = global.partner ) => {
  const existingTemplate = await loadEmailTemplate(template.key, organization, client);

  if(!existingTemplate) {
    //new template
    const _template = new Template() as Reactory.ITemplate;
    const _subjectTemplate = new Template as Reactory.ITemplate;
    const _bodyTemplate = new Template as Reactory.ITemplate;

    _template._id = new ObjectId();
    _template.client = client._id;
    _template.organization = organization._id;
    _template.view = template.key
    _template.elements = [
      _subjectTemplate,
      _bodyTemplate
    ]
  }

};

const getEmailService = (props: TowerStone.ITowerStoneServiceParameters, context: any): TowerStone.ITowerStoneEmailService =>  {
  logger.debug("TowerStoneEmailService Constructor", {props, context});
  return {
    send: async (survey: TowerStone.ISurvey, action: string) => {  
      logger.debug(`Sending email for Survey ${survey.title} for ${action} action`);
      
      return {
        errors: [],
        failed: 0,
        sent: 0
      };
    },
    templates: async (survey: TowerStone.ISurvey) => {
      logger.debug(`Fetching email templates for ${survey.title} via service ref`);

      const result: TowerStone.ISurveyTemplates = {
        assessorTemplates: [],
        delegateTemplates: []
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

      return result;
    },
    patchTemplates: async (survey: TowerStone.ISurvey, templates: TowerStone.ISurveyTemplates) => {
      logger.debug(`Patching email template for survey ${survey.title}`, templates);

      if(survey.id || survey._id) {
        templates.assessorTemplates.forEach((template: TowerStone.ISurveyEmailTemplate) => {
          
        });
      } 

      return templates;
    }
  };
};

const TowerstoneEmailServiceProvider: TowerStone.ITowerStoneEmailServiceProvider = getEmailService;

export default TowerstoneEmailServiceProvider;