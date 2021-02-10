import moment from 'moment';
import lodash, { isArray } from 'lodash';
import logger from '@reactory/server-core/logging';
import Hash from '@reactory/server-core/utils/hash';
import { Reactory } from '@reactory/server-core/types/reactory';
import { getCacheItem, setCacheItem } from '../models';
// import { USER_FILTER_TYPE } from '../types/lasec';


import {
  getTargets,
  getNextActionsForUser,
  groupQuotesByStatus,
  // getLoggedIn360User,
  getSalesDashboardData,
} from './Helpers';

export default {
  Query: {
    LasecGetDashboard: async (obj: any, params: any, context: Reactory.IReactoryContext) => {
      const { dashparams } = params;
      const { user } = context;
      const palette = context.partner.colorScheme();
      logger.debug('>>> LasecGetDashboard - START <<<', dashparams);

      // eslint-disable-next-line
      context.query_options = dashparams.options;
      // const runningAs: any = await getLoggedIn360User(false, context).then();

      let {
        periodStart = moment(dashparams.periodStart || moment().startOf('week')),
        periodEnd = moment(dashparams.periodEnd || moment().endOf('week')),
      } = dashparams;

      const {
        period = 'this-week',
        agentSelection = 'me',
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
          // already bound to incoming params, only check if they are in correct order
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

      const days = moment(periodEnd).diff(moment(periodStart), 'days');
      let periodLabel = `Quotes Dashboard ${periodStart.format('DD MM YY')} till ${periodEnd.format('DD MM YY')} For ${context.user.firstName} ${context.user.lastName}`;
      logger.debug(`${days} Days in period for LasecDashBoard Selected - ${periodLabel}`);
      const teamFilterHash = Hash(teamIds || 'NO_TEAMS');
      logger.debug(`TeamFilter Hash ${teamFilterHash}`, teamIds);
      const repIdsFilterHash = Hash(repIds || 'NO_REPS');
      logger.debug(`repIdsFilterHash ${repIdsFilterHash}`, repIds);

      const cacheKey = Hash(`quote.dashboard.${user._id}.${agentSelection}.${teamFilterHash}.${repIdsFilterHash}.${periodStart.valueOf()}.${periodEnd.valueOf()}`);
      const _cached = await getCacheItem(`${cacheKey}`, null, 60, context.partner);
      if (_cached) {
        logger.debug(`Found results in cache using ${cacheKey}`);
        periodLabel = `${periodLabel} [cache]`;
      }

      const { quotes, invoices, isos }: any = await getSalesDashboardData({
        periodStart, periodEnd, teamIds, repIds, agentSelection,
      }, context).then();

      // const quotes =  SQLResults[1]
      // hasCachedItem === true ? _cached.quotes :
      //  await getQuotes({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();     
      logger.debug(`Fetched ${quotes.length} quote(s)`);
      // const invoices = SQLResults[2]
      // await getInvoices({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug(`Fetched ${invoices.length} invoice(s)`);

      // const isos = hasCachedItem === true ?
      // eslint-disable-next-line
      // _cached.isos : await getISOs({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug(`Fetched  ${isos.length} iso(s)`);

      const targets: number = await getTargets({
        periodStart, periodEnd, teamIds, repIds, agentSelection, period,
      }, context).then();
      logger.debug(`Fetched ${targets} as Target`);

      // eslint-disable-next-line
      const nextActionsForUser: any = await getNextActionsForUser({ periodStart, periodEnd, user: context.user }, context).then();
      logger.debug(`User has ${nextActionsForUser.length} next actions for this period`);
      // switch (agentSelection) {
      //   case USER_FILTER_TYPE.CUSTOM: {
      //     break;
      //   }
      //   case USER_FILTER_TYPE.TEAM: {
      //     _resolvedTeamIds = [...teamIds];
      //     break;
      //   }
      //   case USER_FILTER_TYPE.ME: 
      //   default: {
      //     // default setting, we display charts and data for the user

      //     _resolvedTeamIds = [runningAs.sales_team_id];
      //     break;
      //   }
      // }

      const quoteStatusFunnel: any = {
        chartType: 'FUNNEL',
        data: [],
        options: {},
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/funnel`,
      };

      const quoteStatusPie: any = {
        chartType: 'PIE',
        data: [],
        options: {
          multiple: false,
          outerRadius: 140,
          innerRadius: 70,
          fill: `#${palette[0]}`,
          dataKey: 'value',
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`,
      };


      const allIsos = isos.map((iso: any) => {
        const isoDate = moment(iso.order_date);
        const dataEntry = {
          ...iso,
          value: Math.round(iso.order_value / 100),
          team: iso.sales_team_id || 'NO TEAM',
          date: isoDate.format('YYYY-MM-DD'),
          year: `${isoDate.year()}`,
        };

        dataEntry[`value_${dataEntry.team}`] = dataEntry.value;

        return dataEntry;
      });


      const isoSeries = teamIds.map((teamId: string, index: number) => {
        return {
          dataKey: `value_${teamId}`,
          dataLabel: `ISOs ${teamId}`,
          name: `REP: ${teamId}`,
          data: lodash.filter(allIsos, { team: teamId }),
          stroke: `#${palette[palette.length - (index + 1)]}`,
        };
      });

      isoSeries.push({
        dataKey: 'value',
        dataLabel: 'Combined ISOs',
        name: 'ALL ISOs',
        data: allIsos,
        stroke: `#${palette[0]}`,
      });

      const quoteISOPie: any = {
        chartType: 'LINE',
        data: allIsos,
        options: {
          xAxis: {
            dataKey: 'date',
          },
          series: isoSeries,
        },
        key: `quote-iso/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`,
      };

      const quoteINVPie: any = {
        chartType: 'LINE',
        data: [],
        options: {
          // multiple: false,
          // outerRadius: 140,
          // innerRadius: 70,
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
        key: `quote-inv/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/invoice-composed`,
      };

      const quoteStatusComposed: any = {
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
            stroke: `${context.partner.themeOptions.palette.primary1Color}`,
          },
          bar: {
            dataKey: 'isos',
            dataLabel: 'Total ISO',
            name: 'Total ISOs',
            stroke: `${context.partner.themeOptions.palette.primary2Color}`,
          },
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/composed`,
      };

      const dashboardResult: any = {
        period,
        periodLabel,
        periodStart,
        periodEnd,
        agentSelection,
        teamIds,
        repIds,
        target: targets || 0,
        targetPercent: 0,
        nextActions: {
          owner: context.user,
          actions: nextActionsForUser,
        },
        totalQuotes: 0,
        totalBad: 0,
        statusSummary: [],
        quotes,
        invoices,
        totalInvoiced: 0,
        isos,
        charts: {
          quoteStatusFunnel,
          quoteStatusPie,
          quoteISOPie,
          quoteINVPie,
          quoteStatusComposed,
        },
      };

      const quoteStatusSummary = groupQuotesByStatus(dashboardResult.quotes);
      const naughties = lodash.find(quoteStatusSummary, { key: '5' });
      dashboardResult.totalQuotes = quotes.length;
      dashboardResult.statusSummary = quoteStatusSummary;
      dashboardResult.totalBad = naughties && naughties.naughty ? naughties.naughty : 0;
      dashboardResult.charts.quoteStatusFunnel.data = [];
      dashboardResult.charts.quoteStatusPie.data = [];
      dashboardResult.charts.quoteStatusComposed.data = [];

      dashboardResult.statusSummary.forEach((entry: any, index: number) => {
        dashboardResult.charts.quoteStatusPie.data.push({
          value: entry.totalVATExclusive,
          name: entry.title,
          outerRadius: 140,
          innerRadius: 70,
          fill: `#${palette[(index + 1) % palette.length]}`,
        });
      });

      const dateIndex: any = {

      };

      for (let dayIndex = 0; dayIndex <= days; dayIndex += 1) {
        const modified: string = moment(periodStart).add(dayIndex, 'day').format('YYYY-MM-DD');
        dateIndex[modified] = dayIndex;
        const dataPoint = {
          name: `${dayIndex}`,
          modified,
          invoiced: 0,
          isos: 0,
          quoted: 0,
        };
        dashboardResult.charts.quoteStatusComposed.data.push(dataPoint);
        dashboardResult.charts.quoteINVPie.data.push(dataPoint);
      }

      lodash.sortBy(quotes, [q => q.created]).forEach((quote) => {
        const dayIndex = dateIndex[moment(quote.created).format('YYYY-MM-DD')];
        if (dayIndex >= 0) {
          dashboardResult.charts.quoteStatusComposed.data[dayIndex].quoted += Math.round(quote.totals.totalVATExclusive / 100); // eslint-disable-line
        }
      });

      invoices.forEach(($invoice: any) => {
        const theDate = moment($invoice.invoice_date, 'YYYY-MM-DDTHH:mm:ssZ');
        const _key = theDate.format('YYYY-MM-DD');
        const dayIndex = dateIndex[_key];
        if (dayIndex >= 0) {
          dashboardResult.charts.quoteStatusComposed.data[dayIndex].invoiced += Math.round($invoice.invoice_value / 100); // eslint-disable-line
          dashboardResult.charts.quoteINVPie.data[dayIndex].invoiced += Math.round($invoice.invoice_value / 100); // eslint-disable-line
        }
      });

      lodash.sortBy(isos, [i => i.order_date]).forEach(($iso) => {
        // const theDate = moment($iso.order_date, 'YYYY-MM-DDTHH:mm:ssZ');

        const dayIndex = dateIndex[moment($iso.order_date).format('YYYY-MM-DD')];
        if (dayIndex >= 0) {
          dashboardResult.charts.quoteStatusComposed.data[dayIndex].isos += Math.round($iso.order_value / 100); // eslint-disable-line
        }
      });


      // targets.forEach((target) => {
      //  dashboardResult.target += target.target;
      //  totalTargetValue += (target.target * 100) / (target.targetPercent || 100);
      // });

      let invoicesTotal = 0;
      if (isArray(invoices) === true) {
        invoices.forEach((invoice: any) => {
          invoicesTotal += invoice.invoice_value;
        });
      }

      if (isNaN(dashboardResult.target) === false && isNaN(invoicesTotal) === false && dashboardResult.target > 0 && invoicesTotal > 0) { // eslint-disable-line
        dashboardResult.targetPercent = (dashboardResult.target * 100) / (invoicesTotal / 100); // eslint-disable-line
        dashboardResult.totalInvoiced = invoicesTotal;
      }

      dashboardResult.charts.quoteStatusFunnel.data = lodash.reverse(dashboardResult.charts.quoteStatusFunnel.data); // eslint-disable-line

      setCacheItem(`${cacheKey}`, dashboardResult, 60 * 5, context.partner);

      logger.debug('>>> LasecGetDashboard - COMPLETE <<<', dashparams);

      return dashboardResult;
    },
  },
  Mutation: {

  },
};
