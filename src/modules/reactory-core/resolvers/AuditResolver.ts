import Reactory from '@reactory/reactory-core';
import { resolver, query, mutation } from "@reactory/server-core/models/graphql/decorators/resolver";
import { IAuditQueryFilter, IComplianceReportParams } from '../services/ReactoryAuditService';

/**
 * Audit Resolver
 * 
 * GraphQL resolver for audit logging and compliance queries
 */
@resolver
class AuditResolver {
  /**
   * Query audit logs with filtering
   */
  @query('auditLogs')
  async queryAuditLogs(
    obj: any,
    args: { filter: IAuditQueryFilter },
    context: Reactory.Server.IReactoryContext
  ) {
    const auditService = context.getService('core.ReactoryAuditService@1.0.0');
    
    if (!auditService) {
      throw new Error('Audit service not available');
    }

    // Check permissions
    if (!context.hasRole('ADMIN') && !context.hasRole('AUDITOR')) {
      throw new Error('Unauthorized: Insufficient permissions to query audit logs');
    }

    // If not an admin, limit to user's own logs or organization
    const filter = { ...args.filter };
    if (!context.hasRole('ADMIN')) {
      if (filter.userId && filter.userId !== context.user._id.toString()) {
        throw new Error('Unauthorized: Cannot view other users\' audit logs');
      }
      filter.userId = filter.userId || context.user._id.toString();
      filter.organizationId = context.partner._id.toString();
    }

    return await auditService.queryAuditLogs(filter);
  }

  /**
   * Get audit trail for a specific resource
   */
  @query('resourceAuditTrail')
  async getResourceAuditTrail(
    obj: any,
    args: { resourceType: string; resourceId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const auditService = context.getService('core.ReactoryAuditService@1.0.0');
    
    if (!auditService) {
      throw new Error('Audit service not available');
    }

    // Check permissions
    if (!context.hasRole('ADMIN') && !context.hasRole('AUDITOR')) {
      throw new Error('Unauthorized: Insufficient permissions to view audit trails');
    }

    return await auditService.getResourceAuditTrail(args.resourceType, args.resourceId);
  }

  /**
   * Generate compliance report
   */
  @query('complianceReport')
  async generateComplianceReport(
    obj: any,
    args: { params: IComplianceReportParams },
    context: Reactory.Server.IReactoryContext
  ) {
    const auditService = context.getService('core.ReactoryAuditService@1.0.0');
    
    if (!auditService) {
      throw new Error('Audit service not available');
    }

    // Check permissions - only admins can generate compliance reports
    if (!context.hasRole('ADMIN')) {
      throw new Error('Unauthorized: Only administrators can generate compliance reports');
    }

    return await auditService.generateComplianceReport(args.params);
  }

  /**
   * Purge old audit logs (admin only)
   */
  @mutation('purgeOldAuditLogs')
  async purgeOldAuditLogs(
    obj: any,
    args: { retentionDays: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const auditService = context.getService('core.ReactoryAuditService@1.0.0');
    
    if (!auditService) {
      throw new Error('Audit service not available');
    }

    // Check permissions - only admins can purge audit logs
    if (!context.hasRole('ADMIN')) {
      throw new Error('Unauthorized: Only administrators can purge audit logs');
    }

    // Log this action
    await auditService.logAuditEvent({
      action: 'purge_audit_logs',
      source: 'core.audit',
      eventType: 'delete',
      resourceType: 'audit_logs',
      metadata: { retentionDays: args.retentionDays },
      success: true
    });

    const deleted = await auditService.purgeOldAuditLogs(args.retentionDays);
    
    return deleted;
  }
}

export const AuditResolverDefinition: Reactory.Graph.IReactoryResolverDefinition = {
  nameSpace: 'core',
  name: 'AuditResolver',
  version: '1.0.0',
  resolver: AuditResolver,
  query: ['auditLogs', 'resourceAuditTrail', 'complianceReport'],
  mutation: ['purgeOldAuditLogs'],
  description: 'Resolver for audit logging and compliance queries'
};

export default AuditResolver;

