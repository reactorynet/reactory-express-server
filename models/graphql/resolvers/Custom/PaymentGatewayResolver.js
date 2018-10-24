import { ObjectId } from 'mongodb';
import co from 'co';
import { filter } from 'lodash';
import moment from 'moment';
import fetch from 'node-fetch';
import logger from '../../../../logging';

const endpointForTarget = (target) => {
  switch (target) {
    case 'PRODUCTION':
    case 'STAGING': return 'https://payments.r4.life/';
    case 'LOCAL':
    default: return 'http://localhost:3001/';
  }
};

export default {
  AuditTrail: {
    when: o => moment(o.when).valueOf(),
    files: (o) => {
      return {
        inbox: o.fileStats.counts.inbox,
        outbox: o.fileStats.counts.outbox,
        sent: o.fileStats.counts.sent,
        quarantine: o.fileStats.counts.quarantine,
      };
    },
  },
  Query: {
    gatewayAuditTrail(obj, {
      from, till, target, paymentMethod = 'NAEDO', debitOrderStatus = ['paid', 'none', 'submit'],
    }) {
      // const partnerSettings = global.partner.settings;
      logger.info('Input values', { from, till, target });

      return co.wrap(function* syncGatewayGenerator(opts) {
        const uris = {
          cpsAudit: `${opts.endpoint}cps/audit?from=${opts.start}&till=${opts.end}`,
          transactions: `${opts.endpoint}admin/transactions?from=${opts.start}&till=${opts.end}`,
          paymentSchedule: `${opts.endpoint}admin/payment-schedule?from=${opts.start}&till=${opts.end}&paymentMethod=${paymentMethod}&debitOrderStatus=${debitOrderStatus}`,
          errors: `${opts.endpoint}admin/errors?till=${opts.start}&till=${opts.end}`,
        };
        try {
          let cpsAudit = yield fetch(uris.cpsAudit).then(data => data.json());
          const transactionAudit = yield fetch(uris.transactions).then(data => data.json());
          const paymentSchedulesAudit = yield fetch(uris.paymentSchedule).then(data => data.json());
          const errorsAudit = yield fetch(uris.errors).then(data => data.json());

          cpsAudit = cpsAudit.map((auditEntry) => {
            const fixedEntry = { ...auditEntry };

            const theDate = {
              start: moment(auditEntry.when).startOf('day'),
              end: moment(auditEntry.when).endOf('day'),
            };

            fixedEntry.transactions = filter(transactionAudit.transactions, (transaction) => {
              return moment(transaction.created).isBetween(theDate.start, theDate.end, 'seconds', '[]');
            });

            fixedEntry.errors = filter(errorsAudit.errors, (error) => {
              return moment(error.created).isBetween(theDate.start, theDate.end, 'seconds', '[]');
            });

            fixedEntry.paymentSchedules = filter(paymentSchedulesAudit.paymentSchedules, (schedule) => {
              return moment().day(schedule.paymentDay).isBetween(theDate.start, theDate.end, 'seconds', '[]');
            });

            return fixedEntry;
          });

          return cpsAudit;
        } catch (generatorError) {
          logger.error('Error fetching audit trail', generatorError);
          throw generatorError;
        }
      })({
        endpoint: endpointForTarget(target),
        start: moment(from).startOf('day').format('YYYY-MM-DD'),
        end: moment(till).endOf('day').format('YYYY-MM-DD'),
      }).then();
    },
  },
};
