import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import AuditModel from '@reactory/server-modules/reactory-core/models/Audit';
import { PostgresDataSource } from '@reactory/server-modules/reactory-core/models';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import Hash from '@reactory/server-core/utils/hash';

/**
 * Interface for audit log entry parameters
 */
export interface IAuditLogParams {
  action: string;
  source: string;
  user?: string;
  before?: any;
  after?: any;
  actorType?: 'user' | 'system' | 'service' | 'admin';
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  eventType?: 'create' | 'update' | 'delete' | 'access' | 'approve' | 'reject';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
  organizationId?: string;
  moduleName?: string;
  moduleVersion?: string;
}

/**
 * Interface for audit query filter
 */
export interface IAuditQueryFilter {
  userId?: string;
  action?: string | string[];
  source?: string | string[];
  resourceType?: string | string[];
  resourceId?: string;
  eventType?: string | string[];
  moduleName?: string | string[];
  moduleVersion?: string | string[];
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  organizationId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Interface for compliance report parameters
 */
export interface IComplianceReportParams {
  startDate: Date;
  endDate: Date;
  resourceType?: string;
  organizationId?: string;
  format?: 'json' | 'csv' | 'pdf';
}

/**
 * ReactoryAuditService
 * 
 * Provides comprehensive audit logging and compliance tracking capabilities.
 * Supports GDPR compliance, detailed event tracking, and flexible querying.
 * 
 * @service
 * @namespace core
 * @version 1.0.0
 */
export class ReactoryAuditService implements Reactory.Service.IReactoryDefaultService {
  name: string = 'ReactoryAuditService';
  nameSpace: string = 'core';
  version: string = '1.0.0';
  description: string = 'Service for audit logging and compliance tracking';
  
  context: Reactory.Server.IReactoryContext;
  private repository: Repository<AuditModel>;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.repository = PostgresDataSource.getRepository(AuditModel);
  }

  onStartup(): Promise<void> {
    this.context.log(`ReactoryAuditService ${this.context.colors.green('STARTUP OKAY')}`)
    return Promise.resolve();
  }

  /**
   * Log an audit event
   * 
   * @param params - Audit log parameters
   * @returns Promise<AuditModel> - The created audit log entry
   */
  async logAuditEvent(params: IAuditLogParams): Promise<AuditModel> {
    try {
      const {
        action,
        source,
        user,
        before,
        after,
        actorType,
        actorId,
        resourceType,
        resourceId,
        eventType,
        metadata,
        ipAddress,
        userAgent,
        sessionId,
        success = true,
        errorMessage,
        organizationId,
        moduleName,
        moduleVersion
      } = params;

      // Serialize before/after for storage
      const beforeStr = before ? JSON.stringify(this.redactSensitiveData(before)) : null;
      const afterStr = after ? JSON.stringify(this.redactSensitiveData(after)) : null;
      const metadataStr = metadata ? JSON.stringify(metadata) : null;

      // Create signature for integrity
      const signatureData = {
        action,
        source,
        user: user || this.context.user?._id || 'system',
        resourceType,
        resourceId,
        moduleName,
        moduleVersion,
        timestamp: new Date().toISOString()
      };
      const signature = Hash(JSON.stringify(signatureData)).toString();

      // Create audit entry
      const auditEntry = this.repository.create({
        user: user || this.context.user?._id?.toString() || 'system',
        action,
        source,
        signature,
        before: beforeStr,
        after: afterStr,
        actorType: actorType || (this.context.user ? 'user' : 'system'),
        actorId: actorId || this.context.user?._id?.toString(),
        resourceType,
        resourceId,
        eventType,
        metadata: metadataStr,
        ipAddress: ipAddress || this.context.req?.ip,
        userAgent: userAgent || this.context.req?.headers?.['user-agent'],
        sessionId: sessionId || this.context.sessionId,
        success,
        errorMessage,
        organizationId: organizationId || this.context.partner?._id?.toString(),
        moduleName,
        moduleVersion
      });

      const saved = await this.repository.save(auditEntry);
      
      logger.debug(`Audit event logged: ${action} on ${resourceType}/${resourceId} by ${auditEntry.actorId} [${moduleName}@${moduleVersion}]`);
      
      return saved;
    } catch (error) {
      logger.error('Error logging audit event', error);
      throw error;
    }
  }

  /**
   * Query audit logs with filtering and pagination
   * 
   * @param filter - Query filter parameters
   * @returns Promise with audit logs and total count
   */
  async queryAuditLogs(filter: IAuditQueryFilter): Promise<{
    logs: AuditModel[];
    total: number;
    offset: number;
    limit: number;
  }> {
    try {
      const {
        userId,
        action,
        source,
        resourceType,
        resourceId,
        eventType,
        moduleName,
        moduleVersion,
        startDate,
        endDate,
        success,
        organizationId,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = filter;

      const query = this.repository.createQueryBuilder('audit');

      // Apply filters
      if (userId) {
        query.andWhere('audit.user = :userId', { userId });
      }

      if (action) {
        if (Array.isArray(action)) {
          query.andWhere('audit.action IN (:...actions)', { actions: action });
        } else {
          query.andWhere('audit.action = :action', { action });
        }
      }

      if (source) {
        if (Array.isArray(source)) {
          query.andWhere('audit.source IN (:...sources)', { sources: source });
        } else {
          query.andWhere('audit.source = :source', { source });
        }
      }

      if (resourceType) {
        if (Array.isArray(resourceType)) {
          query.andWhere('audit.resourceType IN (:...resourceTypes)', { resourceTypes: resourceType });
        } else {
          query.andWhere('audit.resourceType = :resourceType', { resourceType });
        }
      }

      if (resourceId) {
        query.andWhere('audit.resourceId = :resourceId', { resourceId });
      }

      if (eventType) {
        if (Array.isArray(eventType)) {
          query.andWhere('audit.eventType IN (:...eventTypes)', { eventTypes: eventType });
        } else {
          query.andWhere('audit.eventType = :eventType', { eventType });
        }
      }

      if (moduleName) {
        if (Array.isArray(moduleName)) {
          query.andWhere('audit.moduleName IN (:...moduleNames)', { moduleNames: moduleName });
        } else {
          query.andWhere('audit.moduleName = :moduleName', { moduleName });
        }
      }

      if (moduleVersion) {
        if (Array.isArray(moduleVersion)) {
          query.andWhere('audit.moduleVersion IN (:...moduleVersions)', { moduleVersions: moduleVersion });
        } else {
          query.andWhere('audit.moduleVersion = :moduleVersion', { moduleVersion });
        }
      }

      if (startDate && endDate) {
        query.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
      } else if (startDate) {
        query.andWhere('audit.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        query.andWhere('audit.createdAt <= :endDate', { endDate });
      }

      if (success !== undefined) {
        query.andWhere('audit.success = :success', { success });
      }

      if (organizationId) {
        query.andWhere('audit.organizationId = :organizationId', { organizationId });
      }

      // Apply pagination and sorting
      query
        .orderBy(`audit.${sortBy}`, sortOrder)
        .skip(offset)
        .take(limit);

      const [logs, total] = await query.getManyAndCount();

      return {
        logs,
        total,
        offset,
        limit
      };
    } catch (error) {
      logger.error('Error querying audit logs', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   * 
   * @param params - Report parameters
   * @returns Promise with report data
   */
  async generateComplianceReport(params: IComplianceReportParams): Promise<any> {
    try {
      const {
        startDate,
        endDate,
        resourceType,
        organizationId,
        format = 'json'
      } = params;

      // Query audit logs for the period
      const { logs, total } = await this.queryAuditLogs({
        startDate,
        endDate,
        resourceType,
        organizationId,
        limit: 10000 // Large limit for reports
      });

      // Generate statistics
      const statistics = {
        totalEvents: total,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        byAction: this.groupBy(logs, 'action'),
        byEventType: this.groupBy(logs, 'eventType'),
        byResourceType: this.groupBy(logs, 'resourceType'),
        byModule: this.groupBy(logs, 'moduleName'),
        byModuleVersion: this.groupBy(logs, 'moduleVersion'),
        successRate: this.calculateSuccessRate(logs),
        uniqueUsers: new Set(logs.map(l => l.user)).size,
        uniqueActors: new Set(logs.map(l => l.actorId)).size
      };

      const report = {
        generatedAt: new Date().toISOString(),
        generatedBy: this.context.user?._id || 'system',
        parameters: params,
        statistics,
        events: format === 'json' ? logs : logs.map(l => this.formatLogForExport(l))
      };

      logger.info(`Compliance report generated for period ${startDate} to ${endDate}`);

      return report;
    } catch (error) {
      logger.error('Error generating compliance report', error);
      throw error;
    }
  }

  /**
   * Export audit log data
   * 
   * @param filter - Query filter
   * @param format - Export format (json, csv)
   * @returns Promise with export data
   */
  async exportAuditLog(filter: IAuditQueryFilter, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const { logs } = await this.queryAuditLogs(filter);

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        return this.convertToCsv(logs);
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      logger.error('Error exporting audit log', error);
      throw error;
    }
  }

  /**
   * Delete audit logs older than retention period (GDPR compliance)
   * 
   * @param retentionDays - Number of days to retain logs
   * @returns Promise with number of deleted records
   */
  async purgeOldAuditLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      logger.info(`Purged ${result.affected} audit logs older than ${retentionDays} days`);

      return result.affected || 0;
    } catch (error) {
      logger.error('Error purging old audit logs', error);
      throw error;
    }
  }

  /**
   * Get audit trail for a specific resource
   * 
   * @param resourceType - Type of resource
   * @param resourceId - ID of the resource
   * @returns Promise with audit trail
   */
  async getResourceAuditTrail(resourceType: string, resourceId: string): Promise<AuditModel[]> {
    try {
      const logs = await this.repository.find({
        where: { resourceType, resourceId },
        order: { createdAt: 'ASC' }
      });

      return logs;
    } catch (error) {
      logger.error('Error getting resource audit trail', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Redact sensitive data from objects before logging
   */
  private redactSensitiveData(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = [
      'password',
      'apiKey',
      'secret',
      'token',
      'ssn',
      'creditCard',
      'cvv',
      'pin'
    ];

    const redacted = { ...data };
    
    for (const field of sensitiveFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }

    return redacted;
  }

  /**
   * Group logs by a field
   */
  private groupBy(logs: AuditModel[], field: keyof AuditModel): Record<string, number> {
    return logs.reduce((acc, log) => {
      const key = log[field] as string || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(logs: AuditModel[]): number {
    if (logs.length === 0) return 0;
    const successful = logs.filter(l => l.success).length;
    return (successful / logs.length) * 100;
  }

  /**
   * Format log entry for export
   */
  private formatLogForExport(log: AuditModel): any {
    return {
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      user: log.user,
      action: log.action,
      source: log.source,
      actorType: log.actorType,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      eventType: log.eventType,
      moduleName: log.moduleName,
      moduleVersion: log.moduleVersion,
      success: log.success,
      ipAddress: log.ipAddress,
      organizationId: log.organizationId
    };
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCsv(logs: AuditModel[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID', 'Timestamp', 'User', 'Action', 'Source',
      'Actor Type', 'Resource Type', 'Resource ID', 'Event Type',
      'Module Name', 'Module Version',
      'Success', 'IP Address', 'Organization ID'
    ];

    const rows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.user,
      log.action,
      log.source,
      log.actorType || '',
      log.resourceType || '',
      log.resourceId || '',
      log.eventType || '',
      log.moduleName || '',
      log.moduleVersion || '',
      log.success,
      log.ipAddress || '',
      log.organizationId || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  // Service lifecycle methods
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  onReady(): Promise<any> {
    logger.debug('ReactoryAuditService ready');
    return Promise.resolve(true);
  }
}

export const ReactoryAuditServiceDefinition: Reactory.Service.IReactoryServiceDefinition<ReactoryAuditService> = {
  id: 'core.ReactoryAuditService@1.0.0',
  name: 'ReactoryAuditService',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Service for audit logging and compliance tracking',
  service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
    return new ReactoryAuditService(props, context);
  },  
  serviceType: 'data',
  dependencies: [],
  tags: ['audit', 'compliance', 'logging', 'security'],
};

export default ReactoryAuditService;

