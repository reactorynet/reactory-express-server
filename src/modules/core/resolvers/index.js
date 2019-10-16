import lodash from 'lodash';
import om from 'object-mapper';
import logger from '../../../logging';


import {
  Organization,
  EmailQueue,
  User,
  Survey,
  Assessment,
  LeadershipBrand,
  Organigram,
  Task,
  ReactoryClient,
  BusinessUnit,
} from '../../../models';

import O365 from '../../../azure/graph';

const getLocalMail = async (user, filter) => {
  return await EmailQueue.find({ user: user._id }).then();          
};

const getMicrosoftMail = async (user, filter) => {
   
  if (user.authentications) {
    const found = lodash.find(user.authentications, { provider: 'microsoft' });        
    if (found) {
      logger.debug('Found Authentication Info For MS, check messages via graph', { token: found.props.accessToken, filter });
      const emails = await O365.getEmails(found.props.accessToken, filter);
      logger.debug('Received Email Payload',  { emails:  emails.value });      
      const mailmaps = om(emails, {
        'value[].id': 'emails[].id',
        'value[].body.contentType': 'emails[].format',
        'value[].body.content': 'emails[].message',
        'value[].sender.emailAddress.address': 'emails[].from',
        'value[].sentDateTime': 'emails[].sentAt',
        'value[].receivedDateTime': [
          'emails[].receivedAt',
          'emails[].createdAt',
        ],
        'value[].subject': 'emails[].subject',
        'value[].isRead': 'emails[].isRead',
      });

      logger.debug('Found mails', mailmaps);
      return mailmaps.emails;
    }
  } else {
    logger.debug('No Microsoft Authentication Available');
  }

  return [];
};

export default {
  Query: {
    userEmails: async (parent, mailFilter)=>{      
      logger.debug(`Fetching ${user.fullName(true)} Emails with mail filter`, { mailFilter });
                            
      const localmail = await getLocalMail(global.user, mailFilter).then();
      const microsoftmail = await getMicrosoftMail(global.user, mailFilter).then();
          
      return lodash.sortBy([...localmail, ...microsoftmail], ['createdAt']);
    }
  },
  Mutation: {}
};