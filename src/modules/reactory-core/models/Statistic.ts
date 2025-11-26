import mongoose from 'mongoose';
import time from '@reactory/server-core/models/plugins/time';

const { ObjectId, Mixed } = mongoose.Schema.Types;

/**
 * OpenTelemetry-compatible Statistic/Metric Schema
 * Follows OpenTelemetry Metrics API specification
 */
const Statistic = new mongoose.Schema({
  id: ObjectId,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  // Core metric fields
  name: {
    type: String,
    required: true,
    index: true,
  },
  description: String,
  unit: String,
  type: {
    type: String,
    required: true,
    enum: ['gauge', 'counter', 'histogram', 'summary', 'updowncounter'],
    index: true,
  },
  
  // Value fields
  value: Number,
  histogramData: {
    count: Number,
    sum: Number,
    min: Number,
    max: Number,
    buckets: [{
      upperBound: Number,
      count: Number,
      exemplars: [Mixed],
    }],
  },
  summaryData: {
    count: Number,
    sum: Number,
    quantiles: [{
      quantile: Number,
      value: Number,
    }],
  },
  
  // Dimensional data
  attributes: {
    type: Mixed,
    default: {},
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  // Trace correlation
  traceContext: {
    traceId: String,
    spanId: String,
    traceFlags: Number,
  },
  
  // Resource attributes
  resource: {
    serviceName: String,
    serviceVersion: String,
    serviceInstanceId: String,
    deploymentEnvironment: String,
    hostName: String,
    attributes: Mixed,
  },
  
  // Instrumentation scope
  scope: {
    name: String,
    version: String,
    schemaUrl: String,
  },
  
  // TTL for automatic cleanup
  expiresAt: Date,
  
  // Legacy fields for backward compatibility
  key: String,
  stat: Mixed,
  when: Date,
});

// Add time plugin for createdAt/updatedAt
Statistic.plugin(time);

// Create TTL index for automatic expiration
Statistic.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
Statistic.index({ name: 1, type: 1, timestamp: -1 });
Statistic.index({ 'resource.serviceName': 1, name: 1, timestamp: -1 });
Statistic.index({ 'attributes': 1 }, { sparse: true });

export const StatisticModel = mongoose.model('Statistic', Statistic, 'reactory_statistics');

const StatisticsPackage = new mongoose.Schema({
  id: ObjectId,
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  statistics: [{
    type: ObjectId,
    ref: 'Statistic',
  }],
  processor: String,
  processed: Boolean,
  expires: Date
});

StatisticsPackage.plugin(time)

const StatisticPackage = mongoose.model('StatisticsPackage', StatisticsPackage, 'reactory_statistics_packages');
export default StatisticPackage;
