import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import type ReactoryStatisticsService from '../../services/Statistics/StatisticsService';

/**
 * Get the Statistics service from context
 */
const getStatisticsService = (context: Reactory.Server.IReactoryContext): ReactoryStatisticsService => {
  return context.getService('core.ReactoryStatisticsService@1.0.0') as ReactoryStatisticsService;
};

/**
 * Modern Statistics Resolver using decorator pattern
 * Handles OpenTelemetry-compatible metrics/statistics
 */
// @ts-ignore - decorator called without ()
@resolver
class StatisticsResolver {
  resolver: any;

  // QUERIES

  /**
   * Get statistics based on filter criteria
   */
  @roles(['USER'], 'args.context')
  @query('CoreGetStatistics')
  async getStatistics(
    obj: any,
    params: {
      filter?: {
        names?: string[];
        types?: string[];
        attributes?: Record<string, any>;
        serviceName?: string;
        from?: Date;
        till?: Date;
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const statisticsService = getStatisticsService(context);
    try {
      return await statisticsService.getStatistics(params.filter);
    } catch (error) {
      context.log('Error retrieving statistics', { error, filter: params.filter }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  /**
   * Get a statistics package by reference
   */
  @roles(['USER'], 'args.context')
  @query('CoreGetStatisticsPackage')
  async getStatisticsPackage(
    obj: any,
    params: { reference: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const statisticsService = getStatisticsService(context);
    try {
      return await statisticsService.getStatisticsPackage(params.reference);
    } catch (error) {
      context.log('Error retrieving statistics package', { error, reference: params.reference }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  /**
   * Get multiple statistics packages
   */
  @roles(['USER'], 'args.context')
  @query('CoreGetStatisticsPackages')
  async getStatisticsPackages(
    obj: any,
    params: { filter?: any },
    context: Reactory.Server.IReactoryContext
  ) {
    const statisticsService = getStatisticsService(context);
    try {
      return await statisticsService.getStatisticsPackages(params.filter);
    } catch (error) {
      context.log('Error retrieving statistics packages', { error, filter: params.filter }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  // MUTATIONS

  /**
   * Publish/create new statistics
   */
  @roles(['USER'], 'args.context')
  @mutation('CorePublishStatistics')
  async publishStatistics(
    obj: any,
    params: { entries: Partial<Reactory.Models.IStatistic>[] },
    context: Reactory.Server.IReactoryContext
  ) {
    try {
      const statisticsService = getStatisticsService(context);
      const result = await statisticsService.publishStatistics(params.entries, {
        reference: `stats_${Date.now()}`,
        title: 'Statistics Package',
        description: `Created at ${new Date().toISOString()}`,
      });

      // Return the package
      return result.package || {
        id: (result.statistics[0] as any)?._id?.toString() || Date.now().toString(),
        reference: `stats_${Date.now()}`,
        statistics: result.statistics,
        createdAt: new Date(),
      };
    } catch (error) {
      context.warn('Error publishing statistics', { error, entriesCount: params.entries.length }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  /**
   * Process statistics with a custom processor
   */
  @roles(['ADMIN', 'WORKFLOW_ADMIN'], 'args.context')
  @mutation('CoreProcessStatistics')
  async processStatistics(
    obj: any,
    params: {
      reference: string;
      processor: string;
      params?: any;
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const statisticsService = getStatisticsService(context);
    try {
      return await statisticsService.processStatistics(
        params.reference,
        params.processor,
        params.params
      );
    } catch (error) {
      context.log('Error processing statistics', { error, reference: params.reference }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  /**
   * Update an existing statistic
   */
  @roles(['USER'], 'args.context')
  @mutation('CoreUpdateStatistic')
  async updateStatistic(
    obj: any,
    params: {
      input: {
        id: string;
        description?: string;
        value?: number;
        histogramData?: any;
        summaryData?: any;
        attributes?: Record<string, any>;
        ttl?: number;
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const statisticsService = getStatisticsService(context);
    try {
      const { id, ...updates } = params.input;
      return await statisticsService.updateStatistic(id, updates as any);
    } catch (error) {
      context.log('Error updating statistic', { error, id: params.input.id }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  /**
   * Update a statistics package
   */
  @roles(['USER'], 'args.context')
  @mutation('CoreUpdateStatisticsPackage')
  async updateStatisticsPackage(
    obj: any,
    params: {
      input: {
        id: string;
        title?: string;
        description?: string;
        processed?: boolean;
        processor?: string;
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const statisticsService = getStatisticsService(context);
    try {
      const { id, ...updates } = params.input;
      return await statisticsService.updateStatisticsPackage(id, updates);
    } catch (error) {
      context.log('Error updating statistics package', { error, id: params.input.id }, 'error', 'StatisticsResolver');
      throw error;
    }
  }

  // PROPERTY RESOLVERS

  /**
   * Resolve Statistic ID
   */
  @property('Statistic', 'id')
  statisticId(obj: any) {
    return obj._id?.toString() || obj.id;
  }

  /**
   * Resolve StatisticsPackage ID
   */
  @property('StatisticsPackage', 'id')
  packageId(obj: any) {
    return obj._id?.toString() || obj.id;
  }

  /**
   * Resolve StatisticsPackage user
   */
  @property('StatisticsPackage', 'user')
  async packageUser(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    // If user is already populated, return it
    if (typeof obj.user === 'object' && obj.user !== null) {
      return obj.user;
    }

    // Fetch user by ID if needed
    if (obj.user) {
      const userService = context.getService('core.UserService@1.0.0') as any;
      if (userService && typeof userService.getUserById === 'function') {
        return await userService.getUserById(obj.user);
      }
    }

    return null;
  }

  /**
   * Resolve StatisticsPackage partner
   */
  @property('StatisticsPackage', 'partner')
  async packagePartner(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    // If partner is already populated, return it
    if (typeof obj.partner === 'object' && obj.partner !== null) {
      return obj.partner;
    }

    return null;
  }
}

export default StatisticsResolver;

