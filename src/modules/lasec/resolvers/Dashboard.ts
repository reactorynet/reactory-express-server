


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
import O365 from '../../../azure/graph';
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
  getQuotes,
  getInvoices,
  getISOs,
  getTargets,
  getNextActionsForUser,
  groupQuotesByStatus,
  groupQuotesByProduct
} from './Helpers';


const defaultDashboardParams: DashboardParams = {
  period: DATE_FILTER_PRESELECT.THIS_WEEK,
  periodStart: moment().startOf('week'),
  periodEnd: moment().endOf('week'),
  agentSelection: USER_FILTER_TYPE.ME,
  teamIds: [],
  repIds: [],
  status: [],
  options: {

  }
};


const defaultProductDashboardParams: ProductDashboardParams = {
  period: DATE_FILTER_PRESELECT.THIS_WEEK,
  periodStart: moment().startOf('week'),
  periodEnd: moment().endOf('week'),
  agentSelection: USER_FILTER_TYPE.ME,
  teamIds: [],
  repIds: [],
  status: [],
  productClass: []
};


export default {
  Query: {
    LasecGetDashboard: async (obj: any, params: any, context: any, info: any) => {
      const { dashparams } = params;
      let palette = global.partner.colorScheme();      
      logger.debug(`>>> LasecGetDashboard - START <<<`, dashparams);
      
      context.query_options = dashparams.options;

      let {
        period = "this-week",
        periodStart = moment(dashparams.periodStart || moment().startOf('week')),
        periodEnd = moment(dashparams.periodEnd || moment().endOf('week')),
        agentSelection = "me",
        teamIds = null,
        repIds = null,
      } = dashparams;
    
      const now = moment();
      switch (period) {
        case 'today': {
          periodStart = moment(now).startOf('day');
          periodEnd = moment(periodStart).endOf('day');
          break;
        }
        case 'yesterday': {
          periodStart = moment(now).startOf('day').subtract('24', 'hour');
          periodEnd = moment(periodStart).endOf('day');
          break;
        }
        case 'last-week': {
          periodStart = moment(now).startOf('week').subtract('1', 'week');
          periodEnd = moment(periodStart).endOf('week');
          break;
        }
        case 'this-month': {
          periodStart = moment(now).startOf('month');
          periodEnd = moment(periodStart).endOf('month');
          break;
        }
        case 'last-month': {
          periodStart = moment(now).startOf('month').subtract('1', 'month');
          periodEnd = moment(periodStart).endOf('month');
          break;
        }
        case 'this-year': {
          periodStart = moment(now).startOf('year');
          periodEnd = moment(periodStart).endOf('year');
          break;
        }
        case 'last-year': {
          periodStart = moment(now).startOf('year').subtract(1, 'year');
          periodEnd = moment(periodStart).endOf('year');
          break;
        }
        case 'custom': {
          //already bound to incoming params, only check if they are in correct order
          if (periodEnd.isBefore(periodStart) === true) {
            const _periodStart = moment(periodEnd);
            const _periodEnd = moment(periodStart);

            periodStart = _periodStart;
            periodEnd = _periodEnd;
          }
          break;
        }
        case 'this-week':
        default: {
          periodStart = moment().startOf('month');
          periodEnd = moment().endOf('month');
          break;
        }
      }

      let days = moment(periodEnd).diff(moment(periodStart), 'days');      
      let periodLabel = `Quotes Dashboard ${periodStart.format('DD MM YY')} till ${periodEnd.format('DD MM YY')} For ${global.user.firstName} ${global.user.lastName}`;
      logger.debug(`${days} Days in period for LasecDashBoard Selected - ${periodLabel}`);
      const teamFilterHash = Hash(teamIds || "NO_TEAMS");
      logger.debug(`TeamFilter Hash ${teamFilterHash}`, teamIds);
      const repIdsFilterHash = Hash(repIds || "NO_REPS");
      logger.debug(`repIdsFilterHash ${repIdsFilterHash}`, repIds);

      let cacheKey = Hash(`quote.dashboard.${user._id}.${agentSelection}.${teamFilterHash}.${repIdsFilterHash}.${periodStart.valueOf()}.${periodEnd.valueOf()}`);
      let _cached = await getCacheItem(`${cacheKey}`);
      let hasCachedItem = false;
      if (_cached) {
        hasCachedItem = true;
        logger.debug(`Found results in cache using ${cacheKey}`);
        periodLabel = `${periodLabel} [cache]`;
      }
      
                
      const quotes = hasCachedItem === true ? _cached.quotes : await getQuotes({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug(`Fetched ${quotes.length} quote(s)`);
      const invoices = hasCachedItem === true ? _cached.invoices : await getInvoices({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug(`Fetched ${invoices.length} invoice(s)`);
      
      const isos = hasCachedItem === true ? _cached.isos : await getISOs({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug(`Fetched  ${isos.length} iso(s)`);

      const targets: number = await getTargets({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug(`Fetched ${targets} as Target`);
      
      const nextActionsForUser = await getNextActionsForUser({ periodStart, periodEnd, user: global.user }).then();
      logger.debug(`User has ${nextActionsForUser.length} next actions for this period`)
      


      switch(agentSelection) {
        case USER_FILTER_TYPE.CUSTOM: {
          //work on rep ids
        }
        case USER_FILTER_TYPE.TEAM: {
          //
        }
        case USER_FILTER_TYPE.ME : {
          //default setting, we display charts and data for the user
        }
      }

      const quoteStatusFunnel = {
        chartType: 'FUNNEL',
        data: [],
        options: {},
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/funnel`
      };

      const quoteStatusPie = {
        chartType: 'PIE',
        data: [],
        options: {
          multiple: false,
          outerRadius: 140,
          innerRadius: 70,
          fill: `#${palette[0]}`,
          dataKey: 'value',
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`
      };

      const quoteISOPie = {
        chartType: 'PIE',
        data: isos.map((iso: any, isoIndex: number) => {
          return {
            ...iso,
            "value": iso.order_value / 100,
            "name": iso.sales_team_id || `iso_${isoIndex}`,
            "outerRadius": 140,
            "innerRadius": 70,
            "fill": `#${palette[isoIndex + 1 % palette.length]}`
          };
        }),
        options: {
          multiple: false,
          outerRadius: 140,
          innerRadius: 70,
          fill: `#${palette[1]}`,
          dataKey: 'value',
        },
        key: `quote-iso/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`
      };

      const quoteINVPie = {
        chartType: 'LINE',
        data: [],
        options: {
          //multiple: false,
          //outerRadius: 140,
          //innerRadius: 70,          
          xAxis: {
            dataKey: 'modified',
          },
          line: {
            dataKey: 'invoiced',
            dataLabel: 'Invoiced',
            name: 'Total Invoiced',
            stroke: `#${palette[0]}`,
          },          
        },
        key: `quote-inv/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/invoice-composed`
      };

      const quoteStatusComposed = {
        chartType: 'COMPOSED',
        data: [],
        options: {
          xAxis: {
            dataKey: 'modified',
          },
          line: {
            dataKey: 'quoted',
            dataLabel: 'Total Quoted',
            name: 'Total Quoted',
            stroke: `#${palette[3]}`,
          },
          area: {
            dataKey: 'invoiced',
            dataLabel: 'Total Invoiced',
            name: 'Total Invoiced',
            stroke: `${global.partner.themeOptions.palette.primary1Color}`,
          },
          bar: {
            dataKey: 'isos',
            dataLabel: 'Total ISO',
            name: 'Total ISOs',
            stroke: `${global.partner.themeOptions.palette.primary2Color}`,
          }
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/composed`
      };

      const dashboardResult = {
        period: period,
        periodLabel,
        periodStart,
        periodEnd,
        agentSelection,
        teamIds,
        repIds,
        target: targets || 0,
        targetPercent: 0,
        nextActions: {
          owner: global.user,
          actions: nextActionsForUser
        },
        totalQuotes: 0,
        totalBad: 0,
        statusSummary: new Array<any>(),
        quotes,
        invoices,
        isos,
        charts: {
          quoteStatusFunnel,
          quoteStatusPie,
          quoteISOPie,
          quoteINVPie,
          quoteStatusComposed,
        }
      };

      dashboardResult.totalQuotes = quotes.length;
      dashboardResult.statusSummary = groupQuotesByStatus(dashboardResult.quotes);
      dashboardResult.charts.quoteStatusFunnel.data = [];
      dashboardResult.charts.quoteStatusPie.data = [];
      dashboardResult.charts.quoteStatusComposed.data = [];

      dashboardResult.statusSummary.forEach((entry, index) => {        

        dashboardResult.charts.quoteStatusPie.data.push({
          "value": entry.totalVATExclusive,
          "name": entry.title,
          "outerRadius": 140,
          "innerRadius": 70,
          "fill": `#${palette[index + 1 % palette.length]}`
        });
      });

      let dayEntries = [];
      let dateIndex: any = {

      };

      for (let dayIndex = 0; dayIndex <= days; dayIndex += 1) {
        let modified: string = moment(periodStart).add(dayIndex, "day").format("YYYY-MM-DD");
        dateIndex[modified] = dayIndex;
        let dataPoint = {
          "name": `${dayIndex}`,
          "modified": modified,
          "invoiced": 0,
          "isos": 0,
          "quoted": 0,
        };
        dashboardResult.charts.quoteStatusComposed.data.push(dataPoint)
        dashboardResult.charts.quoteINVPie.data.push(dataPoint);
      }

      lodash.sortBy(quotes, [q => q.modified]).forEach((quote) => {
        let dayIndex = dateIndex[moment(quote.modified).format('YYYY-MM-DD')];
        if (dayIndex >= 0) {
          dashboardResult.charts.quoteStatusComposed.data[dayIndex].quoted += (quote.totals.totalVATExclusive / 100);          
        }
      });

      lodash.sortBy(invoices, [i => i.invoice_date]).forEach((invoice) => {
        let dayIndex = dateIndex[moment(invoice.invoice_date).format('YYYY-MM-DD')];
        if (dayIndex >= 0) {
          dashboardResult.charts.quoteStatusComposed.data[dayIndex].invoiced += (invoice.invoice_value / 100);
          dashboardResult.charts.quoteINVPie.data[dayIndex].invoiced += (invoice.invoice_value / 100);
        }
      });

      lodash.sortBy(isos, [i => i.order_date]).forEach((iso) => {
        let dayIndex = dateIndex[moment(iso.order_date).format('YYYY-MM-DD')];
        if (dayIndex >= 0) {
          dashboardResult.charts.quoteStatusComposed.data[dayIndex].isos += (iso.order_value / 100);
        }
      });


      let totalTargetValue = 0;
      //targets.forEach((target) => {
      //  dashboardResult.target += target.target;
      //  totalTargetValue += (target.target * 100) / (target.targetPercent || 100);
      //});

      let invoicesTotal = 0;
      if (isArray(invoices) === true) {
        invoices.forEach((invoice: any) => {
          invoicesTotal += invoice.invoice_value
        });
      }

      if (isNaN(dashboardResult.target) === false && isNaN(invoicesTotal) === false && dashboardResult.target > 0 && invoicesTotal > 0) {
        dashboardResult.targetPercent = dashboardResult.target * 100 / invoicesTotal;
      }

      dashboardResult.charts.quoteStatusFunnel.data = lodash.reverse(dashboardResult.charts.quoteStatusFunnel.data);

      setCacheItem(`${cacheKey}`, dashboardResult, 60 * 5);

      logger.debug(`>>> LasecGetDashboard - COMPLETE <<<`, dashparams);

      return dashboardResult;
    },
  },
  Mutation: {
    
  }
};