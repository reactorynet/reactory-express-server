import Reactory from '@reactory/reactory-core';
import { StatisticModel } from '../../models/Statistic';
import StatisticPackageModel from '../../models/Statistic';
import logger from '@reactory/server-core/logging';
import { ObjectId } from 'mongodb';
import { service } from '@reactory/server-core/application/decorators';



const doStoreStatistics: boolean = process.env.DO_STORE_STATISTICS === 'true' || false;

/**
 * Service for managing OpenTelemetry-compatible statistics/metrics
 * Provides CRUD operations and query capabilities for metrics data
 */
@service({
  name: "ReactoryStatisticsService",
  nameSpace: "core",
  version: "1.0.0",
  description: "Service for managing statistics in Reactory",
  id: "core.ReactoryStatisticsService@1.0.0",
  serviceType: "statistics",
  dependencies: []
})
class ReactoryStatisticsService implements Reactory.Service.IReactoryService {
  name: string = 'ReactoryStatisticsService';
  nameSpace: string = 'core';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  props: any;
  
  // Telemetry metrics
  private metricsInitialized: boolean = false;
  private statisticsPublished?: Reactory.Telemetry.ICounter;
  private statisticsValidationErrors?: Reactory.Telemetry.ICounter;
  private statisticsStored?: Reactory.Telemetry.ICounter;
  private batchSize?: Reactory.Telemetry.IHistogram;
  private operationDuration?: Reactory.Telemetry.IHistogram;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }
  
  /**
   * Initialize telemetry metrics for the service
   */
  private initializeMetrics(): void {
    if (this.metricsInitialized || !this.context.telemetry) {
      return;
    }
    
    try {
      const { telemetry } = this.context;
      
      this.statisticsPublished = telemetry.createCounter('statistics_published_total', {
        description: 'Total number of statistics published',
        persist: false, // Don't persist service metrics to avoid recursion
      });
      
      this.statisticsValidationErrors = telemetry.createCounter('statistics_validation_errors_total', {
        description: 'Total number of statistics validation errors',
        persist: false,
      });
      
      this.statisticsStored = telemetry.createCounter('statistics_stored_total', {
        description: 'Total number of statistics successfully stored',
        persist: false,
      });
      
      this.batchSize = telemetry.createHistogram('statistics_batch_size', {
        description: 'Size of statistics batches being published',
        unit: 'count',
        persist: false,
      });
      
      this.operationDuration = telemetry.createHistogram('statistics_operation_duration_seconds', {
        description: 'Duration of statistics service operations',
        unit: 'seconds',
        persist: false,
      });
      
      this.metricsInitialized = true;
    } catch (error) {
      // Silently fail if telemetry initialization fails
      logger.debug('Failed to initialize StatisticsService telemetry', { error });
    }
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
    this.initializeMetrics();
    
    return await this.context.telemetry.measureAsync(
      'statistics_query_duration_seconds',
      async () => {
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
      },
      { 
        operation: 'get_statistics',
        has_filter: filter ? 'true' : 'false'
      },
      { persist: false }
    );
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
    this.initializeMetrics();
    
    // Track batch size
    if (this.batchSize) {
      this.batchSize.record(entries.length, {
        operation: 'publish',
        has_package: packageOptions?.reference ? 'true' : 'false',
      });
    }
    
    return await this.context.telemetry.measureAsync(
      'statistics_publish_duration_seconds',
      async () => {
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
          
          // Process each statistic through telemetry and validate
          const validationErrors: any[] = [];
          const telemetryErrors: any[] = [];
          
          for (let index = 0; index < statisticsToInsert.length; index++) {
            const stat = statisticsToInsert[index];
            
            // Validate the statistic
            try {
              const doc = new (StatisticModel as any)(stat);
              await doc.validate();
            } catch (error) {
              validationErrors.push({
                index,
                entry: stat,
                error: error instanceof Error ? error.message : String(error),
              });
              continue; // Skip telemetry processing for invalid entries
            }
            
            // Process through telemetry based on type
            try {
              const metricName = stat.name;
              const metricType = stat.type?.toLowerCase();
              const metricValue = stat.value;
              const metricAttributes = stat.attributes || {};
              
              const metricOptions: Reactory.Telemetry.MetricOptions = {
                description: stat.description,
                unit: stat.unit,
                persist: false, // Already persisting via StatisticsService
                resource: stat.resource,
              };
              
              switch (metricType) {
                case 'counter':
                  if (metricValue !== undefined) {
                    const counter = this.context.telemetry.createCounter(metricName, metricOptions);
                    counter.add(metricValue, metricAttributes);
                  }
                  break;
                  
                case 'updowncounter':
                  if (metricValue !== undefined) {
                    const upDownCounter = this.context.telemetry.createUpDownCounter(metricName, metricOptions);
                    upDownCounter.add(metricValue, metricAttributes);
                  }
                  break;
                  
                case 'histogram':
                  if (metricValue !== undefined) {
                    const histogram = this.context.telemetry.createHistogram(metricName, metricOptions);
                    histogram.record(metricValue, metricAttributes);
                  } else if (stat.histogramData) {
                    // Handle histogram data with buckets
                    const histogram = this.context.telemetry.createHistogram(metricName, metricOptions);
                    // Record the sum/count if available
                    if (stat.histogramData.sum !== undefined) {
                      histogram.record(stat.histogramData.sum, metricAttributes);
                    }
                  }
                  break;
                  
                case 'gauge':
                  if (metricValue !== undefined) {
                    const gauge = this.context.telemetry.createGauge(metricName, metricOptions);
                    gauge.set(metricValue, metricAttributes);
                  }
                  break;
                  
                case 'summary':
                  // Summaries are similar to histograms in OpenTelemetry
                  if (metricValue !== undefined) {
                    const histogram = this.context.telemetry.createHistogram(metricName, metricOptions);
                    histogram.record(metricValue, metricAttributes);
                  } else if (stat.summaryData) {
                    const histogram = this.context.telemetry.createHistogram(metricName, metricOptions);
                    if (stat.summaryData.sum !== undefined) {
                      histogram.record(stat.summaryData.sum, metricAttributes);
                    }
                  }
                  break;
                  
                default:
                  logger.warn('Unknown statistic type', { type: metricType, name: metricName });
              }
            } catch (error) {
              telemetryErrors.push({
                index,
                entry: stat,
                error: error instanceof Error ? error.message : String(error),
              });
              // Don't fail on telemetry errors, just log them
              logger.debug('Failed to publish statistic to telemetry', { 
                error, 
                stat: { name: stat.name, type: stat.type } 
              });
            }
          }

          // Report validation errors
          if (validationErrors.length > 0) {
            // Track validation errors
            if (this.statisticsValidationErrors) {
              this.statisticsValidationErrors.add(validationErrors.length, {
                operation: 'publish',
              });
            }
            
            logger.error('Invalid statistics', { 
              errorCount: validationErrors.length,
              errors: validationErrors 
            });
            throw new Error(`Validation failed for ${validationErrors.length} statistic(s)`);
          }
          
          // Log telemetry errors (non-fatal)
          if (telemetryErrors.length > 0) {
            logger.warn('Some statistics failed to publish to telemetry', {
              errorCount: telemetryErrors.length,
              errors: telemetryErrors,
            });
          }
          
          if (doStoreStatistics) { 
            // Insert statistics efficiently with ordered: false for parallel processing
            const statistics = await StatisticModel.insertMany(statisticsToInsert, {
              ordered: false, // Continue inserting even if one fails, process in parallel
              lean: true,     // Return plain JavaScript objects instead of full Mongoose documents
            });

            // Track successful storage
            if (this.statisticsStored) {
              this.statisticsStored.add(statistics.length, {
                operation: 'publish',
                has_package: packageOptions?.reference ? 'true' : 'false',
              });
            }

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

            // Track published statistics
            if (this.statisticsPublished) {
              this.statisticsPublished.add(statistics.length, {
                operation: 'publish',
                stored: 'true',
                has_package: packageOptions?.reference ? 'true' : 'false',
              });
            }

            logger.debug('Published statistics', {
              count: statistics.length,
              packageId: statisticsPackage?._id,
              telemetryPublished: statisticsToInsert.length - telemetryErrors.length,
              telemetryErrors: telemetryErrors.length,
            });

            return {
              statistics: statistics as any[],
              package: statisticsPackage,
            };
          } else {
            // Track published but not stored
            if (this.statisticsPublished) {
              this.statisticsPublished.add(entries.length, {
                operation: 'publish',
                stored: 'false',
              });
            }
            
            logger.debug('Statistics published to telemetry only (storage disabled)', {
              count: entries.length,
              telemetryPublished: statisticsToInsert.length - telemetryErrors.length,
              telemetryErrors: telemetryErrors.length,
            });
            
            return {
              statistics: [],
              package: null,
            };
          }
        } catch (error) {
          logger.error('Error publishing statistics', { error, entriesCount: entries.length });
          throw error;
        }
      },
      {
        operation: 'publish',
        batch_size: entries.length.toString(),
      },
      { persist: false }
    );
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
    this.initializeMetrics();
    
    return await this.context.telemetry.measureAsync(
      'statistics_processing_duration_seconds',
      async () => {
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
      },
      {
        operation: 'process',
        processor_name: processor,
        reference: reference.substring(0, 8), // Truncate for low cardinality
      },
      { persist: false }
    );
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
    this.initializeMetrics();
    
    return await this.context.telemetry.measureAsync(
      'statistics_aggregation_duration_seconds',
      async () => {
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
      },
      {
        operation: 'aggregate',
        group_by: groupBy,
        metric_name: name,
      },
      { persist: false }
    );
  }
}

export default ReactoryStatisticsService;
