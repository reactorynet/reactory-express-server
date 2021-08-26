
import lodash from 'lodash';
import om from 'object-mapper';
import logger from '@reactory/server-core/logging';
import {
  EmailQueue,
} from '@reactory/server-core/models';

import O365 from '@reactory/server-modules/reactory-azure/services/graph';
import ApiError from '@reactory/server-core/exceptions';

const getLocalMail = async (user, filter = { size: 10, page: 0, search: '' }) => {
  return await EmailQueue.UserEmailsWithTextSearch(user, filter).then();
};

const getMicrosoftMail = async (user, filter) => {

  if (user.authentications) {
    const found = lodash.find(user.authentications, { provider: 'microsoft' });
    if (found) {
      logger.debug('Found Authentication Info For MS, check messages via graph', { token: found.props.accessToken, filter });
      const emails = await O365.getEmails(found.props.accessToken, filter);
      logger.debug('Received Email Payload', { emails: emails.value });
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
    userEmails: async (parent, { mailFilter }, context) => {
      logger.debug(`Fetching ${user.fullName(true)} Emails with mail filter`, { mailFilter });
      let localmail = [];
      let microsoftmail = [];

      if (lodash.isArray(mailFilter.via) === true) {
        if (lodash.indexOf(mailFilter.via, 'local') >= 0) {
          localmail = await getLocalMail(context.user, mailFilter).then();
        }

        if (lodash.indexOf(mailFilter.via, 'microsoft') >= 0) {
          microsoftmail = await getMicrosoftMail(context.user, mailFilter).then();
        }

        return lodash.sortBy([...localmail, ...microsoftmail], ['createdAt']);
      }

      throw new ApiError('Please indicate via which search provider you want to search');
    },
  },
  Mutation: {
  }
};
