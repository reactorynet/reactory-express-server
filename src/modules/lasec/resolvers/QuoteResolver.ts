
import om from 'object-mapper';
import moment, { Moment } from 'moment';
import lodash, { isArray, isNil, isString } from 'lodash';
import { ObjectId } from 'mongodb';
import gql from 'graphql-tag';
import uuid from 'uuid';
import lasecApi from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { Organization, User, Task } from '@reactory/server-core/models';
import { Quote, QuoteReminder } from '@reactory/server-modules/lasec/schema/Quote';
import amq from '@reactory/server-core/amq';
import Hash from '@reactory/server-core/utils/hash';
import { clientFor } from '@reactory/server-core/graph/client';
import { getCacheItem, setCacheItem } from '../models';
import emails from '@reactory/server-core/emails';

import { Quote as LasecQuote,
  LasecDashboardSearchParams,
  LasecProductDashboardParams,
  USER_FILTER_TYPE,
  DATE_FILTER_PRESELECT
} from '../types/lasec';

import CONSTANTS, { LOOKUPS, OBJECT_MAPS } from '../constants';
import {
  totalsFromMetaData,
  synchronizeQuote,
  getTargets,
  getQuotes,
  getQuoteEmails,
  getLasecQuoteById,
  LasecSendQuoteEmail,
  lasecGetProductDashboard,
  getSalesOrders,
  getPagedQuotes,
  getPagedClientQuotes,
  lasecGetQuoteLineItems,
  getClientSalesOrders,
  getCRMSalesOrders,
  getISODetails,
  getClientInvoices,
  getClientSalesHistory,
  getSODocuments,
  deleteSalesOrdersDocument,
  getSalesOrderComments,
  saveSalesOrderComment,
  getSalesOrderDocBySlug,
  uploadSalesOrderDoc,
  getCRMInvoices
 } from './Helpers';


export interface DashboardParams extends LasecDashboardSearchParams {};

export interface ProductDashboardParams extends LasecProductDashboardParams {};

const lookups = CONSTANTS.LOOKUPS;

const maps = { ...OBJECT_MAPS };

const totalsFromMeta = totalsFromMetaData;


const getQuoteTimeline = async (quote, args, context, info) => {
  const { options = { bypassEmail: true } } = args;
  logger.debug(`Getting timeline for quote "${quote.code}" >> `, options);

  const { timeline, id, meta, code } = quote;
  const _timeline: Array<any> = []; //create a virtual timeline

  if (isArray(timeline) === true && timeline.length > 0) {
    timeline.forEach(tl => _timeline.push(tl));
  }

  if (options && options.bypassEmail !== true) {
    let mails: Array<any> = [];
    try {
      mails = await getQuoteEmails(quote.code).then();
    } catch (exc) {
      logger.error(`Could not read the user email due to an error, ${exc.message}`);
      mails = [];
    }

    if (mails && isArray(mails) === true && mails.length > 0) {

      mails.forEach((mail) => {
        if (mail.id !== 'no-id') {
          logger.debug('Transforming Email to timeline entry', mail);
          const entry = om(mail, {
            'createdAt': 'when',
            'from': {
              key: 'who',
              transform: (sourceValue: String) => {
                //user lookup
                return User.find({ email: sourceValue }).then()
              },
            },
            'message': 'notes'
          });
          entry.actionType = 'email',
            entry.what = `Email Communication from ${mail.from} ${mail.to ? 'to ' + mail.to : ''}`,
            logger.debug(`Transformed Email:\n ${JSON.stringify(mail)} \n to timeline entry \n ${entry} \n`);
          _timeline.push(entry);
        }
      });
    }
  }
  //create timeline from mails

  return lodash.sortBy(_timeline, ['when']);
}



export default {
  CRMSaleOrderComment: {
    id: ({ id, _id }) => id || _id,
    who: async ({ who }) => {
      if (ObjectId.isValid(who)) {
        return User.findById(who);
      }
    }
  },
  QuoteReminder: {
    id: ({ id, _id }) => id || _id,
    who: ({ id, who = [] }) => {
      if (who.length === 0) return null

      return who.map(whoObj => ObjectId.isValid(whoObj) ? User.findById(whoObj) : null);
    },
    quote: ({ quote }) => {
      if (quote && ObjectId.isValid(quote) === true) return Quote.findById(quote);
      else return null;
    }
  },
  QuoteTimeLine: {
    who: (tl) => {
      if (ObjectId.isValid(tl.who)) {
        return User.findById(tl.who);
      }

      return null;
    },
    reminder: (tl) => {
      if (ObjectId.isValid(tl.reminder) === true) {
        return QuoteReminder.findById(tl.reminder);
      }

      return null;
    }

  },
  LasecQuoteItem: {
    id: ({ id, _id }) => (id || _id)
  },
  Quote: {
    id: ({ _id }) => {
      return `${_id}`;
    },
    code: (quote) => {
      const { meta, code } = quote;
      if (code && typeof code === 'string') return code;
      if (meta && meta.reference) return meta.reference;
      if (meta && meta.source.id) return meta.source.id;

      return null;
    },
    customer: async (quote) => {
      if (quote === null) throw new ApiError('Quote is null');
      const { customer } = quote;
      if (isNil(customer) === false) {
        if (customer && ObjectId.isValid(customer) === true) {
          const loadedCustomer = await User.findById(quote.customer).then();
          if (loadedCustomer !== undefined && loadedCustomer !== null) {
            return loadedCustomer;
          }
        }
      }

      if (quote.meta && quote.meta.source) {
        const { customer_full_name, customer_id } = quote.meta.source;

        if (customer_full_name && customer_id) {
          //check if a customer with this reference exists?
          let _customer = await User.findByForeignId(customer_id, global.partner.key).then();
          if (_customer !== null) {
            logger.debug(`Customer ${_customer.fullName()} found via foreign reference`);
            quote.customer = _customer._id;
            if (typeof quote.save === 'function') {
              try { await quote.save() } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }
            return _customer;
          }
          else {
            _customer = User.parse(customer_full_name);
            _customer = new User(_customer);
            _customer.setPassword(uuid());

            _customer.meta = {};
            _customer.meta.owner = global.partner.key;
            _customer.meta.reference = customer_id;
            _customer.meta.lastSync = null;
            _customer.meta.nextSync = new Date().valueOf();
            _customer.meta.mustSync = true;

            await _customer.save();
            quote.customer = _customer._id;

            if (typeof quote.save === 'function') {
              try { await quote.save(); } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }
            _customer.addRole(global.partner._id, 'CUSTOMER');
            amq.raiseWorkFlowEvent('startWorkFlow', {
              id: 'LasecSyncCustomer',
              version: 1,
              src: 'QuoteResolver:Quote.customer()',
              data: {
                reference: customer_id,
                id: _customer.id,
                owner: global.partner.key,
                user: global.user.id,
              },
            }, global.partner);

            return _customer;
          }
        }
      }

      return {
        id: new ObjectId(),
        firstName: 'NO',
        lastName: 'CUSTOMER',
        email: '404@customer.reactory.net'
      }
    },
    headers: async () => {

      let headers = [
        {
          id: new ObjectId(),
          text: 'No Header',
          headerId: 'default',
          items: [],
        }
      ];

      return headers;
    },
    lineItems: async (quote: any) => {
      const { code } = quote;
      logger.debug(`Finding LineItems for Quote ${code}`, { quote });
      return lasecGetQuoteLineItems(code);
    },
    statusName: (quote) => {
      const { source } = quote.meta;
      return quote.statusName || source.status_name;
    },
    status: ({ status, meta }) => {
      return status || meta.source ? meta.source.status_id : 'unset';
    },
    statusGroup: ({ meta }) => {
      return meta.source &&
        meta.source.substatus_id ? meta.source.substatus_id : '1';
    },
    statusGroupName: (quote) => {
      const { statusGroupName, meta } = quote;

      if (statusGroupName) return statusGroupName;

      if (meta && meta.source.substatus_id) {
        quote.statusGroupName = lookups.statusGroupName[`${meta.source.substatus_id}`];

        return quote.statusGroupName;
      }

      return null;
    },
    totals: (quote) => {
      const { meta, totals } = quote;

      if (totals) return totals;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);

        if (quote.save) {

          quote.totals = _totals;

          try {
            quote.save();
          } catch (parallelSaveError) {
            logger.warn(`Could not update quote`, parallelSaveError);
          }

        }

        return _totals;
      }

      return {
        totalVATExclusive: 0,
        totalVAT: 0,
        totalVATInclusive: 0,
        totalDiscount: 0,
        totalDiscountPercent: 0,
      };
    },
    allowedStatus: ({ meta }) => {
      return meta && meta.source && meta.source.allowed_status_ids
    },
    company: async (quote) => {
      const { meta } = quote;

      if (isNil(quote.company) === false) {
        if (ObjectId.isValid(quote.company) === true) {
          const loadedOrganization = await Organization.findById(quote.company).then();
          if (loadedOrganization === null || loadedOrganization === undefined) {
            logger.error(`Could not load the organization with the reference number ${quote.company}, will fallback to meta check`);
          } else {
            return loadedOrganization;
          }
        }
      }


      if (quote.meta && quote.meta.source) {
        logger.debug(`No organization, checking meta data`);
        const { company_id, company_trading_name } = meta.source;
        if (company_trading_name && company_id) {
          //check if a customer with this reference exists?
          logger.debug(`No organization, checking foreign reference ${company_id} ${global.partner.key}`);
          let _company = await Organization.findByForeignId(company_id, global.partner.key).then();
          if (_company !== null) {
            if (typeof quote.save === "function") {
              quote.company = _company._id;
              await quote.save();
            }

            return _company;
          }
          else {
            logger.debug(`No organization, checking meta data`);
            _company = new Organization({
              meta: {
                owner: global.partner.key,
                reference: company_id,
                mustSync: true,
                lastSync: null,
              },
              name: company_trading_name,
              tradingName: company_trading_name,
              clients: {
                active: [global.partner.key]
              },
              code: company_id,
              createdAt: new Date().valueOf(),
              updatedAt: new Date().valueOf(),
              public: false,
              updatedBy: global.user._id
            });

            await _company.save();

            if (typeof quote.save === "function") {
              quote.company = _company._id;
              try {
                await quote.save();
              } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }

            amq.raiseWorkFlowEvent('startWorkFlow', {
              id: 'LasecSyncCompany',
              version: 1,
              src: 'QuoteResolver:Quote.company()',
              data: {
                reference: company_id,
                id: _company._id,
                owner: global.partner.key,
                user: global.user.id,
              },
            }, global.partner);


            return _company;
          }
        }
      }

      throw new ApiError('No Company Info')
    },
    totalVATExclusive: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVATExclusive) return totals.totalVATExclusive;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.totalVATExclusive;
      }

      return 0;
    },
    totalVAT: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVAT) return totals.totalVAT;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;

        return _totals.totalVAT;
      }

      return 0;
    },
    totalVATInclusive: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVATInclusive) return totals.totalVATInclusive;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.totalVATInclusive;
      }

      return 0;
    },
    GP: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.GP) return totals.GP;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.GP;
      }

      return 0;
    },
    actualGP: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.actualGP) return totals.actualGP;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.actualGP;
      }

      return 0;
    },
    created: ({ created }) => { return moment(created); },
    modified: ({ modified }) => { return moment(modified); },
    expirationDate: ({ expirationDate, meta }) => {
      if (expirationDate) return moment(expirationDate);
      if (meta && meta.source && meta.source.expiration_date) return moment(meta.source.expiration_date);
      return null;
    },
    note: ({ note }) => (note),
    timeline: getQuoteTimeline,
    lastAction: async (quote) => {
      let items = await getQuoteTimeline(quote, { bypassEmail: true }, null, null).then();
      if(items && items.length > 0) {
        return items[0];
      }
    },
    meta: (quote) => {
      return quote.meta || {}
    }
  },
  LasecCompany: {
    id: ({ id }) => (id),
  },
  LasecCustomer: {
    id: ({ id }) => (id),
  },
  LasecQuoteDashboard: {
    id: ({
      period, periodStart, periodEnd, status,
    }) => {
      return `${period}.${moment(periodStart).valueOf()}.${moment(periodEnd).valueOf()}`;
    },
  },
  Query: {
    LasecGetQuoteList: async (obj, { search }) => {
      return getQuotes({ search });
    },
    LasecGetProductDashboard: async (obj, { dashparams }) => {
      return lasecGetProductDashboard(dashparams);
    },
    LasecGetQuoteById: async (obj, { quote_id }) => {
      if (isNil(quote_id) === true) throw new ApiError('This method requies a quote id to work');
      const result = await getLasecQuoteById(quote_id).then();
      return result;
    },
    LasecGetCRMQuoteList: async (obj, args) => {
      return getPagedQuotes(args);
    },
    LasecGetCRMClientQuoteList: async (obj, args) => {
      return getPagedClientQuotes(args);
    },
    LasecGetCRMSalesOrders: async (obj, args) => {
      return getSalesOrders(args);
    },
    LasecGetCRMClientSalesOrders: async (obj, args) => {
      return getClientSalesOrders(args);
    },
    LasecGetSaleOrderDocument: async (obj, args) => {
      return getSODocuments(args);
    },
    LasecGetPagedCRMSalesOrders: async (obj, args) => {
      try {
        return getCRMSalesOrders(args);
      } catch(err) {
        logger.error(`Error Fetching CRM SalesOrders`)
        throw new ApiError('Could not fetch sales order data', { error: err, displayInAppNotification: true });
      }

    },
    LasecGetISODetail: async (obj, args) => {
      return getISODetails(args);
    },
    LasecGetCRMClientInvoices: async (obj, args) => {
      return getClientInvoices(args);
    },
    LasecGetCRMInvoices: async (obj, args) => {
      return getCRMInvoices(args);
    },
    LasecGetCRMClientSalesHistory: async (obj, args) => {
      return getClientSalesHistory(args);
    },
    LasecGetSaleOrderComments: async (obj, args) => {
      return getSalesOrderComments(args);
    },
    LasecGetSalesOrderDocumentBySlug: async (obj, args) => {
      return getSalesOrderDocBySlug(args);
    },
  },
  Mutation: {
    LasecSetQuoteHeader: async (parent, { quote_id, input }) => {
      switch (input.action) {
        case 'NEW': {
          return lasecApi.Quotes.createQuoteHeader({ quote_id, ...input });
        }
        case 'ADD_ITEM': {
          return lasecApi.Quotes.addItemToQuoteHeader({ quote_id, ...input });
        }
        case 'REMOVE_ITEM': {
          return lasecApi.Quotes.removeItemFromHeader({ quote_id, ...input });
        }
        case 'REMOVE_HEADER': {
          return lasecApi.Quotes.removeQuoteHeader({ quote_id, ...input });
        }
        default: {
          throw new ApiError(`The ${input.action} action is not supported`);
        }
      }
    },
    LasecUpdateQuoteStatus: async (parent, { quote_id, input }) => {

      logger.debug('Mutation.LasecUpdateQuoteStatus(...)', { quote_id, input });

      const quote = await getLasecQuoteById(quote_id).then();

      if (!quote) {
        const message = `Quote with quote id ${quote_id}, not found`;
        throw new ApiError(message, { quote_id, message, code: 404 });
      }

      if (!quote.note && input.note) {
        quote.note = input.note;
      }

      const { user } = global;

      let reminder = null;

      if (lodash.isArray(quote.timeline) === false) quote.timeline = [];

      const timelineEntry = {
        when: new Date().valueOf(),
        what: `Next actions updated by ${global.user.firstName} ${global.user.lastName} and a reminder set for ${moment().add(reminder || 3, 'days').format('YYYY-MM-DD HH:mm')}`,
        who: global.user._id,
        notes: input.note,
        reason: input.reason
      };


      if (input.reminder > 0) {
        reminder = new QuoteReminder({
          quote: quote._id,
          who: user._id,
          next: moment().add(input.reminder, 'days').valueOf(),
          actioned: false,
          actionType: input.nextAction || 'other',
          via: ['microsoft', 'reactory'],
          text: `Reminder, please ${input.nextAction} with customer regarding Quote ${quote_id}`,
          importance: 'normal',
        });
        await reminder.save().then();

        logger.debug(`SAVED REMINDER:: ${reminder}`);

        amq.raiseWorkFlowEvent('startWorkFlow', {
          id: 'LasecSetReminderForQuote',
          version: 1,
          src: 'QuoteResolver:LasecUpdateQuoteStatus',
          data: {
            reminder: reminder,
            partner: global.partner,
            user: global.user,
            quote: quote
          },
        }, global.partner);
        timelineEntry.reminder = reminder._id;
      }

      // quote.status = input.status,
      quote.timeline.push(timelineEntry);

      amq.raiseWorkFlowEvent('startWorkflow', {
        id: 'LasecQuoteCacheInvalidate',
        version: 1,
        src: 'QuoteResolver:LasecQuoteUpdateStatus',
        data: {
          quote_id,
          quote,
          statusUpdate: input,
          reason: 'Status.Update'
        },
      });

      await quote.save();

      //create task via ms if the user has MS authentication
      let taskCreated = false;
      let _message = '.';
      if (user.getAuthentication("microsoft") !== null) {
        const taskCreateResult = await clientFor(user, global.partner).mutate({
          mutation: gql`
            mutation createOutlookTask($task: CreateTaskInput!) {
              createOutlookTask(task: $task) {
                Successful
                Message
                TaskId
              }
            }`, variables: {
            "task": {
              "id": `${user._id.toString()}`,
              "via": "microsoft",
              "subject": reminder.text,
              "startDate": moment(reminder.next).add(-6, "h").format("YYYY-MM-DD HH:MM"),
              "dueDate": moment(reminder.next).format("YYYY-MM-DD HH:MM")
            }
          }
        })
          .then()
          .catch(error => {
            logger.debug(`CREATE OUTLOOK TASK FAILED - ERROR:: ${error}`);
            _message = `. ${error.message}`
            return {
              quote,
              success: true,
              message: `Quote status updated${_message}`
            };
          });


        if (taskCreateResult.data && taskCreateResult.data.createOutlookTask) {

          logger.debug(`SYNCED:: ${JSON.stringify(taskCreateResult)}`);

          // Save the task id in meta on the quote reminder
          reminder.meta = {
            reference: {
              source: 'microsoft',
              referenceId: taskCreateResult.data.createOutlookTask.TaskId
            },
            lastSync: moment().valueOf(),
          }

          await reminder.save();

          taskCreated = true;
          _message = ' and task synchronized via Outlook task.'
        }
      }

      return {
        quote,
        success: true,
        message: `Quote status updated${_message}`
      };
    },
    LasecCreateClientEnquiry: async (parent, params) => {
      const { customerId: String } = params;

      return {
        id: new ObjectId(),
        customer: {
          id: new ObjectId(),
          fullName: 'Placeholder'
        },
        company: {
          id: new ObjectId(),
          tradingName: 'Trading Name'
        }
      }
    },
    SynchronizeNextActionsToOutloook: async (parent, { nextActions }) => {

      // TODO - at a later stage
      // Add categories to the task, so we can pull all tasks for that period and then delete
      // tasks that have been actioned

      const { user } = global;

      nextActions.forEach(async action => {
        const quoteReminder = await QuoteReminder.findById(action.id).then();

        if ((!quoteReminder.meta || !quoteReminder.meta.reference || !quoteReminder.meta.reference.source || quoteReminder.meta.reference.source != 'microsoft')) {
          logger.debug(`CREATING TASK FOR:: ${action.id}`);
          if (!quoteReminder.actioned) {
            if (user.getAuthentication("microsoft") !== null) {
              const taskCreateResult = await clientFor(user, global.partner).mutate({
                mutation: gql`
                  mutation createOutlookTask($task: CreateTaskInput!) {
                    createOutlookTask(task: $task) {
                      Successful
                      Message
                      TaskId
                    }
                  }`, variables: {
                  "task": {
                    "id": `${user._id.toString()}`,
                    "via": "microsoft",
                    "subject": action.text,
                    "startDate": moment(action.next).add(-6, "h").format("YYYY-MM-DD HH:MM"),
                    "dueDate": moment(action.next).format("YYYY-MM-DD HH:MM")
                  }
                }
              })
                .then()
                .catch(error => {
                  logger.debug(`CREATE OUTLOOK TASK FAILED - ERROR:: ${error}`);
                  return {
                    success: false,
                    message: `Error syncing actions`
                  };
                });

              if (taskCreateResult.data && taskCreateResult.data.createOutlookTask) {
                logger.debug(`TASK CREATED:: ${JSON.stringify(taskCreateResult)}`);
                quoteReminder.meta = {
                  reference: {
                    source: 'microsoft',
                    referenceId: taskCreateResult.data.createOutlookTask.TaskId
                  },
                  lastSync: moment().valueOf(),
                }
                await quoteReminder.save();
              }
            }
          }
        } else {

          // If is actioned delete task from outlook
          // This wont run as actioned items arent in the list
          if (action.actioned) {
            const taskDeleteResult = await clientFor(user, global.partner).mutate({
              mutation: gql`
                mutation deleteOutlookTask($task: DeleteTaskInput!) {
                  deleteOutlookTask(task: $task) {
                    Successful
                    Message
                  }
                }`, variables: {
                "task": {
                  "via": "microsoft",
                  "taskId": action.meta.reference.referenceId,
                }
              }
            })
              .then();

            if (taskDeleteResult.data && taskDeleteResult.data.deleteOutlookTask) {
              logger.debug(`TASK DELETED :: ${JSON.stringify(taskDeleteResult)}`);
              quoteReminder.meta = null;
              await quoteReminder.save();
            }
          }
        }

      });

      return {
        success: true,
        message: 'Actions successfully synced!'
      }

    },
    LasecMarkNextActionAsActioned: async (parent, { id }) => {
      const { user } = global;
      const quoteReminder = await QuoteReminder.findById(id).then();
      if (!quoteReminder) {
        return {
          success: false,
          message: `Could not find a matching quote reminder.`
        }
      }
      quoteReminder.actioned = true;
      const result = await quoteReminder.save()
        .then()
        .catch(error => {
          return {
            success: false,
            message: `Could not update this quote reminder.`
          }
        });


      if (quoteReminder.meta && quoteReminder.meta.reference && quoteReminder.meta.reference.source && quoteReminder.meta.reference.source == 'microsoft') {
        const taskDeleteResult = await clientFor(user, global.partner).mutate({
          mutation: gql`
              mutation deleteOutlookTask($task: DeleteTaskInput!) {
                deleteOutlookTask(task: $task) {
                  Successful
                  Message
                }
              }`, variables: {
            "task": {
              "via": "microsoft",
              "taskId": quoteReminder.meta.reference.referenceId,
            }
          }
        })
          .then();

        if (taskDeleteResult.data && taskDeleteResult.data.deleteOutlookTask) {
          logger.debug(`TASK DELETED :: ${JSON.stringify(taskDeleteResult)}`);
          quoteReminder.meta = null;
          await quoteReminder.save().then();
        }
      }

      return {
        success: true,
        message: `Quote reminder marked as actioned.`
      }
    },
    LasecSendQuoteEmail: async (obj, args) => {
      return LasecSendQuoteEmail(args);
    },
    LasecDeleteSaleOrderDocument: async (obj, args) => {
      return deleteSalesOrdersDocument(args);
    },
    LasecUploadSaleOrderDocument: async (obj, args) => {
      return uploadSalesOrderDoc(args);
    },
    LasecCRMSaveSaleOrderComment: async (obj, args) => {
      return saveSalesOrderComment(args);
    },
  }
};
