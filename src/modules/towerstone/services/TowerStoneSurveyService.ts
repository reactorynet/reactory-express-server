


import lodash from 'lodash';
import logger from 'logging';
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';
import { FormNameSpace } from '../constants';
import { ObjectId } from 'bson';
import { Survey } from '@reactory/server-core/models'
import { Reactory } from '@reactory/server-core/types/reactory';
import { PagingRequest, PagingResult } from '@reactory/server-core/database/types';
import { Aggregate } from 'mongoose';

class SurveyService implements TowerStone.ITowerStoneSurveyService {

  getPagedSlice(items: any[] = [], paging: PagingRequest = { page: 1, pageSize: 10 }): any {
    debugger;
    let result: any = {
      paging: {
        hasNext: false,
        total: items.length,
      },
      items: [],
    };

    const start = paging.page === 1 ? 0 : ((paging.page - 1) * paging.pageSize);
    if (start <= items.length) {
      if (start + paging.pageSize + 1 <= items.length) {
        result.paging.hasNext = true;
      }
      result.items = lodash.slice(items, start, start + paging.pageSize);
    }

    return result;
  }


  async get(id: string): Promise<TowerStone.ISurveyDocument> {
    return await Survey.findById(id).then();
  }
  async pagedTimeline(id: string, paging: PagingRequest): Promise<TowerStone.IPagedSurveyTimeline> {
    logger.debug(`Returning a paged timeline for survey id ${id}, paging: ${paging.page, paging.pageSize}`);

    const result: TowerStone.IPagedSurveyTimeline = {
      id: `${id}:${paging.page}:${paging.pageSize}`,
      paging: {
        hasNext: false,
        page: paging.page,
        pageSize: paging.pageSize,
        total: 0,
      },
      timeline: [],
    };

    const survey: TowerStone.ISurveyDocument = await Survey.findById(id).then();

    if (!survey) return result;

    const paged = this.getPagedSlice(survey.timeline, paging);

    result.paging.hasNext = paged.paging.hasNext;
    result.paging.total = paged.paging.total;
    result.timeline = paged.items;

    return result;
  }

  async pagedDelegates(id: string, paging: PagingRequest): Promise<TowerStone.IPagedSurveyDelegates> {
    logger.debug(`Returning a paged delegate entry list for survey id ${id}, paging: ${paging.page, paging.pageSize}`);

    const result: TowerStone.IPagedSurveyDelegates = {
      id: `${id}:${paging.page}:${paging.pageSize}`,
      paging: {
        hasNext: false,
        page: paging.page,
        pageSize: paging.pageSize,
        total: 0,
      },
      delegates: [],
    };

    const survey: TowerStone.ISurveyDocument = await Survey.findById(id).then();

    logger.debug(`${survey ? 'Found' : 'Did not find'} survey with id: ${id}`)
    if (!survey) return result;


    const paged = this.getPagedSlice(survey.delegates, paging);

    result.paging.hasNext = paged.paging.hasNext;
    result.paging.total = paged.paging.total;
    result.delegates = paged.items;

    return result;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props, context) {
    this.context = context;
    this.props = props;
  }

}

const service_definition: Reactory.IReactoryServiceDefinition = {
  id: 'towerstone.SurveyService@1.0.0',
  name: 'Towerstone Survey Service 💱',
  description: 'Service class for TowerStone / Mores appplication.',
  dependencies: [],
  serviceType: 'TowerStone.ITowerStoneSurveyService',
  service: (props: Reactory.IReactoryServiceProps, context: any) => {
    return new SurveyService(props, context);
  }
};

export default service_definition;