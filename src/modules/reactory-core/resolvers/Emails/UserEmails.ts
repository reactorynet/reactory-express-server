
import lodash from 'lodash';
import logger from '@reactory/server-core/logging';
import {
  EmailQueue,
} from '@reactory/server-modules/reactory-core/models'

import ApiError from '@reactory/server-core/exceptions';

/**
 * The mail service that replaced the legacy `O365.getEmails(token, filter)` shim
 * call (AZ-19). The resolver hands over the **user id** and nothing else: the
 * service owns credential resolution - a vaulted `AzureToken` first, and, for a
 * user who predates the Azure module, AZ-01's legacy bridge onto the User
 * document's `microsoft` authentication (the same token `isTokenValid` keeps
 * fresh on the profile path). No token is read, logged or forwarded here.
 */
export const AZURE_MAIL_SERVICE_ID = 'azure.AzureMailService@1.0.0';

/**
 * The projection the legacy shim asked Graph for, kept verbatim so the messages
 * carry the same properties the mapper below reads.
 *
 * `isRead` is the one addition: the shim's `$select` omitted the very field its
 * mapper read (`value[].isRead`), so `Email.isRead` was always null. The response
 * shape is unchanged - the same keys are still returned - and the field now
 * carries the value Graph actually holds.
 */
export const MICROSOFT_MAIL_SELECT = [
  'id',
  'subject',
  'receivedDateTime',
  'sentDateTime',
  'bodyPreview',
  'body',
  'sender',
  'from',
  'toRecipients',
  'isRead',
].join(',');

/**
 * The page size the legacy call used implicitly: `getEmails` sent no `$top`, so
 * Graph applied its default of 10. `AzureMailService` defaults to 25, so the
 * size is stated explicitly to keep the same first page.
 */
export const MICROSOFT_MAIL_PAGE_SIZE = 10;

/** The parts of the calling User document this resolver reads. */
interface IUserEmailsUser {
  _id?: any;
  fullName?: (withTitle?: boolean) => string;
}

/** The `MailFilter` GraphQL input this resolver reads. */
interface IUserEmailsFilter {
  search?: string;
  via?: string[];
  size?: number;
  page?: number;
}

/** A flattened Graph mail address, as `AzureMailService` normalises it. */
interface IAzureMailAddress {
  name?: string;
  address?: string;
}

/**
 * The subset of `azure.AzureMailService@1.0.0`'s `IMailMessage` this resolver
 * reads, declared locally so the module remains a runtime service dependency and
 * not a compile-time import (the azure module is a separate repository, absent
 * from a server-only checkout).
 */
interface IAzureMailMessage {
  id?: string;
  subject?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  sender?: IAzureMailAddress;
  sentDateTime?: string;
  receivedDateTime?: string;
  isRead?: boolean;
}

/** One page of messages, as `AzureMailService.listMessages` returns it. */
interface IAzureMailPage {
  items?: IAzureMailMessage[];
}

/** The single method this resolver uses from `azure.AzureMailService@1.0.0`. */
interface IAzureMailService {
  listMessages(userId: string, options?: {
    top?: number;
    search?: string;
    select?: string;
  }): Promise<IAzureMailPage>;
}

/** One row of the `Email` GraphQL type, in the shape the legacy mapper produced. */
export interface IUserEmailResult {
  id?: string;
  format?: string;
  message?: string;
  from?: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt?: string;
  subject?: string;
  isRead?: boolean;
}

/**
 * Map a normalised Azure mail message onto the `Email` row the client already
 * consumes.
 *
 * These nine keys are exactly what the retired `object-mapper` spec produced from
 * the shim's raw Graph page (`'value[].body.content' -> 'emails[].message'`,
 * `'value[].sender.emailAddress.address' -> 'emails[].from'`,
 * `'value[].receivedDateTime' -> 'emails[].createdAt'` as well as
 * `'emails[].receivedAt'`, ...). Optional fields stay `undefined` rather than
 * being dropped, so every row has the same key set and GraphQL resolves the
 * missing ones to null, as before.
 */
export const toUserEmail = (message: IAzureMailMessage): IUserEmailResult => ({
  id: message.id,
  format: message.body?.contentType,
  message: message.body?.content,
  from: message.sender?.address,
  sentAt: message.sentDateTime,
  receivedAt: message.receivedDateTime,
  createdAt: message.receivedDateTime,
  subject: message.subject,
  isRead: message.isRead,
});

/**
 * `EmailQueue`'s search is a schema `statics` method, added at runtime, so the
 * model type does not describe it. Declaring the exact signature here keeps the
 * call checked without a blanket `any`.
 */
const emailQueue = EmailQueue as unknown as {
  UserEmailsWithTextSearch(user: IUserEmailsUser, filter: IUserEmailsFilter): Promise<any[]>;
};

const getLocalMail = async (
  user: IUserEmailsUser,
  filter: IUserEmailsFilter = { size: 10, page: 0, search: '' },
): Promise<any[]> => {
  return await emailQueue.UserEmailsWithTextSearch(user, filter);
};

/**
 * Fetch the signed-in user's Microsoft mail through `azure.AzureMailService@1.0.0`.
 *
 * Only the user id crosses the boundary: for a user with no `AzureToken` row the
 * service's legacy bridge reads the token from the User document's `microsoft`
 * authentication, so those users keep working exactly as they did on the shim.
 */
const getMicrosoftMail = async (
  user: IUserEmailsUser,
  filter: IUserEmailsFilter,
  context: any,
): Promise<IUserEmailResult[]> => {
  const mailService: IAzureMailService = context.getService(AZURE_MAIL_SERVICE_ID);

  const search = typeof filter?.search === 'string' && filter.search.trim().length > 0
    ? `"${filter.search}"`
    : undefined;

  logger.debug(`Fetching Microsoft mail via ${AZURE_MAIL_SERVICE_ID}`, { userId: `${user._id}`, filter });

  const page = await mailService.listMessages(`${user._id}`, {
    top: MICROSOFT_MAIL_PAGE_SIZE,
    select: MICROSOFT_MAIL_SELECT,
    ...(search ? { search } : {}),
  });

  const messages = Array.isArray(page?.items) ? page.items : [];
  logger.debug('Received Email Payload', { count: messages.length });

  return messages.map(toUserEmail);
};


export default {
  Query: {
    userEmails: async (
      parent: any,
      { mailFilter }: { mailFilter?: IUserEmailsFilter },
      context: any,
    ) => {
      logger.debug(`Fetching ${context.user?.fullName?.(true)} Emails with mail filter`, { mailFilter });
      let localmail: any[] = [];
      let microsoftmail: IUserEmailResult[] = [];

      if (lodash.isArray(mailFilter?.via) === true) {
        if (lodash.indexOf(mailFilter.via, 'local') >= 0) {
          localmail = await getLocalMail(context.user, mailFilter).then();
        }

        if (lodash.indexOf(mailFilter.via, 'microsoft') >= 0) {
          microsoftmail = await getMicrosoftMail(context.user, mailFilter, context).then();
        }

        return lodash.sortBy([...localmail, ...microsoftmail], ['createdAt']);
      }

      throw new ApiError('Please indicate via which search provider you want to search');
    },
  },
  Mutation: {
  }
};
