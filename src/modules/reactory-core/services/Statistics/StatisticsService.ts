import Reactory from '@reactory/reactory-core';
import { StatisticModel } from '../../models/Statistic';
import StatisticPackageModel from '../../models/Statistic';
import logger from '@reactory/server-core/logging';
import { ObjectId } from 'mongodb';

/**
 * Service for managing OpenTelemetry-compatible statistics/metrics
 * Provides CRUD operations and query capabilities for metrics data
 */
class ReactoryStatisticsService implements Reactory.Service.IReactoryService {
  name: string = 'ReactoryStatisticsService';
  nameSpace: string = 'core';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  props: any;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  /**
   * Get service metadata
   */
  getExecutionContext(): Reactory.Service.IReactoryServiceExecutionContext {
    return {
      service: this,
      context: this.context,
      user: this.context.user,
      partner: this.context.partner,
      started: new Date(),
    };
  }

  /**
   * Set the service context
   */
  setContext(context: Reactory.Server.IReactoryContext): void {
    this.context = context;
  }

  /**
   * Retrieve statistics based on filter criteria
   */
  async getStatistics(filter?: {
    names?: string[];
    types?: string[];
    attributes?: Record<string, any>;
    serviceName?: string;
    from?: Date;
    till?: Date;
  }): Promise<Reactory.Models.IStatistic[]> {
    try {
      const query: any = {};

      if (filter) {
        if (filter.names && filter.names.length > 0) {
          query.name = { $in: filter.names };
        }

        if (filter.types && filter.types.length > 0) {
          query.type = { $in: filter.types.map(t => t.toLowerCase()) };
        }

        if (filter.serviceName) {
          query['resource.serviceName'] = filter.serviceName;
        }

        if (filter.attributes) {
          Object.keys(filter.attributes).forEach(key => {
            query[`attributes.${key}`] = filter.attributes![key];
          });
        }

        if (filter.from || filter.till) {
          query.timestamp = {};
          if (filter.from) query.timestamp.$gte = filter.from;
          if (filter.till) query.timestamp.$lte = filter.till;
        }
      }

      const statistics = await StatisticModel.find(query)
        .sort({ timestamp: -1 })
        .limit(1000)
        .lean();

      return statistics as Reactory.Models.IStatistic[];
    } catch (error) {
      logger.error('Error retrieving statistics', { error, filter });
      throw error;
    }
  }

  /**
   * Get a single statistic by ID
   */
  async getStatisticById(id: string): Promise<Reactory.Models.IStatistic | null> {
    try {
      const statistic = await StatisticModel.findById(id).lean();
      return statistic as Reactory.Models.IStatistic | null;
    } catch (error) {
      logger.error('Error retrieving statistic by ID', { error, id });
      throw error;
    }
  }

  /**
   * Publish/create new statistics
   */
  async publishStatistics(
    entries: Partial<Reactory.Models.IStatistic>[],
    packageOptions?: {
      reference?: string;
      title?: string;
      description?: string;
    }
  ): Promise<{
    statistics: Reactory.Models.IStatistic[];
    package?: any;
  }> {
    try {
      const now = new Date();
      const { partner, user } = this.context;

      // Process and validate entries
      const statisticsToInsert = entries.map(entry => {
        const stat: any = {
          ...entry,
          partner: partner?._id,
          timestamp: entry.timestamp || now,
        };

        // Set expiration if TTL is provided
        if ((entry as any).ttl) {
          stat.expiresAt = new Date(now.getTime() + (entry as any).ttl * 1000);
        }

        // Ensure resource attributes include partner and user info
        if (!stat.resource) {
          stat.resource = {};
        }
        if (partner) {
          stat.resource.partnerId = partner._id.toString();
          stat.resource.partnerName = partner.name;
        }

        return stat;
      });

      // Insert statistics
      const statistics = await StatisticModel.insertMany(statisticsToInsert);

      // Create package if reference provided
      let statisticsPackage;
      if (packageOptions?.reference) {
        statisticsPackage = await StatisticPackageModel.create({
          partner: partner?._id,
          user: user?._id,
          reference: packageOptions.reference,
          title: packageOptions.title,
          description: packageOptions.description,
          statistics: statistics.map(s => s._id),
          processed: false,
          createdAt: now,
        });
      }

      logger.info('Published statistics', {
        count: statistics.length,
        packageId: statisticsPackage?._id,
      });

      return {
        statistics: statistics as any[],
        package: statisticsPackage,
      };
    } catch (error) {
      logger.error('Error publishing statistics', { error, entriesCount: entries.length });
      throw error;
    }
  }

  /**
   * Update an existing statistic
   */
  async updateStatistic(
    id: string,
    updates: Partial<Reactory.Models.IStatistic>
  ): Promise<Reactory.Models.IStatistic | null> {
    try {
      const allowedUpdates = [
        'description',
        'value',
        'histogramData',
        'summaryData',
        'attributes',
      ];

      const updateData: any = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updateData[key] = (updates as any)[key];
        }
      });

      // Handle TTL update
      if ((updates as any).ttl) {
        updateData.expiresAt = new Date(Date.now() + (updates as any).ttl * 1000);
      }

      const statistic = await StatisticModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).lean();

      return statistic as Reactory.Models.IStatistic | null;
    } catch (error) {
      logger.error('Error updating statistic', { error, id });
      throw error;
    }
  }

  /**
   * Get a statistics package by reference
   */
  async getStatisticsPackage(reference: string): Promise<any> {
    try {
      const pkg = await StatisticPackageModel.findOne({ reference })
        .populate('statistics')
        .populate('user')
        .populate('partner')
        .lean();

      return pkg;
    } catch (error) {
      logger.error('Error retrieving statistics package', { error, reference });
      throw error;
    }
  }

  /**
   * Get multiple statistics packages
   */
  async getStatisticsPackages(filter?: any): Promise<any[]> {
    try {
      const query: any = {};

      if (filter?.references && filter.references.length > 0) {
        query.reference = { $in: filter.references };
      }

      if (filter?.from || filter?.till) {
        query.createdAt = {};
        if (filter.from) query.createdAt.$gte = filter.from;
        if (filter.till) query.createdAt.$lte = filter.till;
      }

      const packages = await StatisticPackageModel.find(query)
        .populate('statistics')
        .populate('user')
        .populate('partner')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return packages;
    } catch (error) {
      logger.error('Error retrieving statistics packages', { error, filter });
      throw error;
    }
  }

  /**
   * Process statistics with a custom processor
   */
  async processStatistics(
    reference: string,
    processor: string,
    params?: any
  ): Promise<any> {
    try {
      const pkg = await this.getStatisticsPackage(reference);
      if (!pkg) {
        throw new Error(`Statistics package not found: ${reference}`);
      }

      // Get the processor service
      const processorService = this.context.getService(processor);
      if (!processorService) {
        throw new Error(`Processor service not found: ${processor}`);
      }

      // Process the statistics
      const result = await processorService.process(pkg.statistics, params);

      // Update package
      await StatisticPackageModel.findByIdAndUpdate(pkg._id, {
        $set: {
          processed: true,
          processor,
          updatedAt: new Date(),
        },
      });

      logger.info('Processed statistics', {
        reference,
        processor,
        statisticsCount: pkg.statistics?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error('Error processing statistics', { error, reference, processor });
      throw error;
    }
  }

  /**
   * Update a statistics package
   */
  async updateStatisticsPackage(
    id: string,
    updates: {
      title?: string;
      description?: string;
      processed?: boolean;
      processor?: string;
    }
  ): Promise<any> {
    try {
      const pkg = await StatisticPackageModel.findByIdAndUpdate(
        id,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      )
        .populate('statistics')
        .populate('user')
        .populate('partner')
        .lean();

      return pkg;
    } catch (error) {
      logger.error('Error updating statistics package', { error, id });
      throw error;
    }
  }

  /**
   * Aggregate statistics by metric name and time range
   */
  async aggregateStatistics(
    name: string,
    from: Date,
    till: Date,
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any[]> {
    try {
      const dateFormat = {
        hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } },
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        week: { $dateToString: { format: '%Y-W%V', date: '$timestamp' } },
        month: { $dateToString: { format: '%Y-%m', date: '$timestamp' } },
      };

      const aggregation = await StatisticModel.aggregate([
        {
          $match: {
            name,
            timestamp: { $gte: from, $lte: till },
          },
        },
        {
          $group: {
            _id: dateFormat[groupBy],
            count: { $sum: 1 },
            avgValue: { $avg: '$value' },
            minValue: { $min: '$value' },
            maxValue: { $max: '$value' },
            sumValue: { $sum: '$value' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return aggregation;
    } catch (error) {
      logger.error('Error aggregating statistics', { error, name, from, till });
      throw error;
    }
  }
}

export default ReactoryStatisticsService;
