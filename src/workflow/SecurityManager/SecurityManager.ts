import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import logger from '../../logging';

export interface IUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  active: boolean;
  lastLogin?: Date;
}

export interface IWorkflowPermission {
  workflowId: string;
  version: string;
  permissions: string[];
  allowedUsers: string[];
  allowedRoles: string[];
  requireAuth: boolean;
  ipWhitelist?: string[];
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

export interface IAuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  sessionId?: string;
}

export interface ISecurityEvent {
  id: string;
  timestamp: Date;
  type: 'permission_denied' | 'rate_limit_exceeded' | 'suspicious_activity' | 'authentication_failure' | 'authorization_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  username?: string;
  ipAddress?: string;
  details: Record<string, any>;
  resolved: boolean;
  resolution?: string;
}

export interface ISecurityManagerConfig {
  auditLogEnabled: boolean;
  auditLogRetention: number; // days
  securityEventsEnabled: boolean;
  rateLimitingEnabled: boolean;
  inputValidationEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionKey?: string;
  allowedOrigins: string[];
  maxRequestSize: number; // bytes
  sessionTimeout: number; // milliseconds
  passwordPolicy?: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

export interface IInputValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

export interface IRateLimitInfo {
  current: number;
  limit: number;
  window: number;
  resetTime: Date;
}

export class SecurityManager extends EventEmitter {
  private users: Map<string, IUser> = new Map();
  private workflowPermissions: Map<string, IWorkflowPermission> = new Map();
  private auditLog: IAuditLogEntry[] = [];
  private securityEvents: ISecurityEvent[] = [];
  private rateLimitStore: Map<string, { count: number; resetTime: Date }> = new Map();
  private sessions: Map<string, { userId: string; lastActivity: Date }> = new Map();
  private config: ISecurityManagerConfig;
  private _isInitialized: boolean = false;

  constructor(config: ISecurityManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the security manager
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      logger.warn('SecurityManager already initialized');
      return;
    }

    try {
      logger.info('Initializing SecurityManager');

      // Load users and permissions
      await this.loadUsers();
      await this.loadWorkflowPermissions();

      // Set up cleanup timers
      this.setupCleanupTimers();

      this._isInitialized = true;
      logger.info('SecurityManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SecurityManager', error);
      throw error;
    }
  }

  /**
   * Check if user has permission to execute workflow
   */
  public async checkWorkflowPermission(
    userId: string,
    workflowId: string,
    version: string,
    action: string = 'execute'
  ): Promise<boolean> {
    try {
      const user = this.users.get(userId);
      if (!user || !user.active) {
        await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
          action,
          result: 'denied',
          reason: 'user_not_found_or_inactive'
        });
        return false;
      }

      const permissionKey = `${workflowId}@${version}`;
      const workflowPermission = this.workflowPermissions.get(permissionKey);

      if (!workflowPermission) {
        // No specific permissions defined, allow if user is authenticated
        await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
          action,
          result: 'allowed',
          reason: 'no_specific_permissions'
        });
        return true;
      }

      // Check if authentication is required
      if (workflowPermission.requireAuth && !user) {
        await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
          action,
          result: 'denied',
          reason: 'authentication_required'
        });
        return false;
      }

      // Check user-specific permissions
      if (workflowPermission.allowedUsers.includes(userId)) {
        await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
          action,
          result: 'allowed',
          reason: 'user_specific_permission'
        });
        return true;
      }

      // Check role-based permissions
      const hasRolePermission = user.roles.some(role => 
        workflowPermission.allowedRoles.includes(role)
      );
      if (hasRolePermission) {
        await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
          action,
          result: 'allowed',
          reason: 'role_based_permission'
        });
        return true;
      }

      // Check general permissions
      const hasPermission = workflowPermission.permissions.some(permission =>
        user.permissions.includes(permission)
      );
      if (hasPermission) {
        await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
          action,
          result: 'allowed',
          reason: 'general_permission'
        });
        return true;
      }

      await this.logAuditEvent(userId, 'permission_check', 'workflow', `${workflowId}@${version}`, {
        action,
        result: 'denied',
        reason: 'insufficient_permissions'
      });
      return false;
    } catch (error) {
      logger.error(`Error checking workflow permission: ${workflowId}@${version}`, error);
      return false;
    }
  }

  /**
   * Validate and sanitize input data
   */
  public validateInput(data: any, schema?: Record<string, any>): IInputValidationResult {
    const result: IInputValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      if (!this.config.inputValidationEnabled) {
        return result;
      }

      // Check data size
      const dataSize = JSON.stringify(data).length;
      if (dataSize > this.config.maxRequestSize) {
        result.isValid = false;
        result.errors.push(`Data size exceeds limit: ${dataSize} > ${this.config.maxRequestSize}`);
      }

      // Basic XSS protection
      const sanitizedData = this.sanitizeData(data);
      if (JSON.stringify(sanitizedData) !== JSON.stringify(data)) {
        result.warnings.push('Data was sanitized for security');
        result.sanitizedData = sanitizedData;
      }

      // Schema validation if provided
      if (schema) {
        const schemaValidation = this.validateAgainstSchema(data, schema);
        if (!schemaValidation.isValid) {
          result.isValid = false;
          result.errors.push(...schemaValidation.errors);
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(data);
      if (suspiciousPatterns.length > 0) {
        result.warnings.push(`Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`);
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Input validation error: ${error}`);
      return result;
    }
  }

  /**
   * Check rate limiting for user/IP
   */
  public checkRateLimit(identifier: string, limit: number, window: number): IRateLimitInfo {
    const key = `rate_limit:${identifier}`;
    const now = new Date();
    const current = this.rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new rate limit
      const resetTime = new Date(now.getTime() + window);
      this.rateLimitStore.set(key, { count: 1, resetTime });
      
      return {
        current: 1,
        limit,
        window,
        resetTime
      };
    }

    // Increment existing rate limit
    current.count++;
    this.rateLimitStore.set(key, current);

    if (current.count > limit) {
      // Rate limit exceeded
      this.createSecurityEvent('rate_limit_exceeded', 'medium', {
        identifier,
        current: current.count,
        limit,
        window
      });
    }

    return {
      current: current.count,
      limit,
      window,
      resetTime: current.resetTime
    };
  }

  /**
   * Log audit event
   */
  public async logAuditEvent(
    userId: string | undefined,
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const user = userId ? this.users.get(userId) : undefined;
      
      const auditEntry: IAuditLogEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        userId,
        username: user?.username,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success: !details.error,
        error: details.error,
        sessionId: details.sessionId
      };

      this.auditLog.push(auditEntry);

      // Emit audit event
      this.emit('auditEvent', auditEntry);

      // Clean up old audit logs
      if (this.auditLog.length > 10000) {
        this.auditLog = this.auditLog.slice(-5000);
      }

      logger.debug(`Audit log: ${action} on ${resource} ${resourceId} by ${user?.username || 'unknown'}`);
    } catch (error) {
      logger.error('Failed to log audit event', error);
    }
  }

  /**
   * Create security event
   */
  public createSecurityEvent(
    type: ISecurityEvent['type'],
    severity: ISecurityEvent['severity'],
    details: Record<string, any>,
    userId?: string
  ): void {
    try {
      const user = userId ? this.users.get(userId) : undefined;
      
      const securityEvent: ISecurityEvent = {
        id: this.generateId(),
        timestamp: new Date(),
        type,
        severity,
        userId,
        username: user?.username,
        ipAddress: details.ipAddress,
        details,
        resolved: false
      };

      this.securityEvents.push(securityEvent);

      // Emit security event
      this.emit('securityEvent', securityEvent);

      // Log security event
      logger.warn(`Security event: ${type} (${severity}) - ${JSON.stringify(details)}`);

      // Clean up old security events
      if (this.securityEvents.length > 1000) {
        this.securityEvents = this.securityEvents.slice(-500);
      }
    } catch (error) {
      logger.error('Failed to create security event', error);
    }
  }

  /**
   * Add user
   */
  public addUser(user: IUser): void {
    this.users.set(user.id, user);
    logger.info(`Added user: ${user.username}`);
  }

  /**
   * Remove user
   */
  public removeUser(userId: string): void {
    this.users.delete(userId);
    logger.info(`Removed user: ${userId}`);
  }

  /**
   * Add workflow permission
   */
  public addWorkflowPermission(permission: IWorkflowPermission): void {
    const key = `${permission.workflowId}@${permission.version}`;
    this.workflowPermissions.set(key, permission);
    logger.info(`Added workflow permission: ${key}`);
  }

  /**
   * Remove workflow permission
   */
  public removeWorkflowPermission(workflowId: string, version: string): void {
    const key = `${workflowId}@${version}`;
    this.workflowPermissions.delete(key);
    logger.info(`Removed workflow permission: ${key}`);
  }

  /**
   * Get audit logs
   */
  public getAuditLogs(
    filter?: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): IAuditLogEntry[] {
    let logs = [...this.auditLog];

    if (filter) {
      if (filter.userId) {
        logs = logs.filter(log => log.userId === filter.userId);
      }
      if (filter.action) {
        logs = logs.filter(log => log.action === filter.action);
      }
      if (filter.resource) {
        logs = logs.filter(log => log.resource === filter.resource);
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get security events
   */
  public getSecurityEvents(
    filter?: {
      type?: ISecurityEvent['type'];
      severity?: ISecurityEvent['severity'];
      resolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): ISecurityEvent[] {
    let events = [...this.securityEvents];

    if (filter) {
      if (filter.type) {
        events = events.filter(event => event.type === filter.type);
      }
      if (filter.severity) {
        events = events.filter(event => event.severity === filter.severity);
      }
      if (filter.resolved !== undefined) {
        events = events.filter(event => event.resolved === filter.resolved);
      }
      if (filter.startDate) {
        events = events.filter(event => event.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        events = events.filter(event => event.timestamp <= filter.endDate!);
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Resolve security event
   */
  public resolveSecurityEvent(eventId: string, resolution: string): void {
    const event = this.securityEvents.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
      event.resolution = resolution;
      logger.info(`Resolved security event: ${eventId}`);
    }
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    totalUsers: number;
    activeUsers: number;
    totalWorkflowPermissions: number;
    auditLogEntries: number;
    securityEvents: number;
    unresolvedSecurityEvents: number;
  } {
    return {
      totalUsers: this.users.size,
      activeUsers: Array.from(this.users.values()).filter(u => u.active).length,
      totalWorkflowPermissions: this.workflowPermissions.size,
      auditLogEntries: this.auditLog.length,
      securityEvents: this.securityEvents.length,
      unresolvedSecurityEvents: this.securityEvents.filter(e => !e.resolved).length
    };
  }

  /**
   * Stop the security manager
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping SecurityManager');

      // Clear rate limit store
      this.rateLimitStore.clear();

      // Clear sessions
      this.sessions.clear();

      this._isInitialized = false;
      logger.info('SecurityManager stopped');
    } catch (error) {
      logger.error('Failed to stop SecurityManager', error);
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  // Private methods

  private async loadUsers(): Promise<void> {
    // In a real implementation, this would load from a database
    // For now, we'll create some sample users
    const sampleUsers: IUser[] = [
      {
        id: 'admin',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['workflow.execute', 'workflow.create', 'workflow.delete', 'security.manage'],
        active: true
      },
      {
        id: 'user1',
        username: 'user1',
        email: 'user1@example.com',
        roles: ['user'],
        permissions: ['workflow.execute'],
        active: true
      },
      {
        id: 'user2',
        username: 'user2',
        email: 'user2@example.com',
        roles: ['user'],
        permissions: ['workflow.execute'],
        active: false
      }
    ];

    for (const user of sampleUsers) {
      this.users.set(user.id, user);
    }

    logger.info(`Loaded ${sampleUsers.length} users`);
  }

  private async loadWorkflowPermissions(): Promise<void> {
    // In a real implementation, this would load from a database
    // For now, we'll create some sample permissions
    const samplePermissions: IWorkflowPermission[] = [     
      {
        workflowId: 'reactory.DataProcessingWorkflow',
        version: '1.0.0',
        permissions: ['workflow.execute'],
        allowedUsers: ['admin', 'user1'],
        allowedRoles: ['admin', 'user'],
        requireAuth: true,
        rateLimit: {
          requests: 10,
          window: 60000 // 1 minute
        }
      }
    ];

    for (const permission of samplePermissions) {
      const key = `${permission.workflowId}@${permission.version}`;
      this.workflowPermissions.set(key, permission);
    }

    logger.info(`Loaded ${samplePermissions.length} workflow permissions`);
  }

  private setupCleanupTimers(): void {
    // Clean up old audit logs
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - (this.config.auditLogRetention * 24 * 60 * 60 * 1000));
      this.auditLog = this.auditLog.filter(log => log.timestamp > cutoffDate);
    }, 60 * 60 * 1000); // Run every hour

    // Clean up expired rate limits
    setInterval(() => {
      const now = new Date();
      for (const [key, value] of this.rateLimitStore.entries()) {
        if (now > value.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // Clean up expired sessions
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now.getTime() - session.lastActivity.getTime() > this.config.sessionTimeout) {
          this.sessions.delete(sessionId);
        }
      }
    }, 10 * 60 * 1000); // Run every 10 minutes
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Basic XSS protection
      return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    } else if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    return data;
  }

  private validateAgainstSchema(data: any, schema: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic schema validation
    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push('Expected object type');
    } else if (schema.type === 'array' && !Array.isArray(data)) {
      errors.push('Expected array type');
    } else if (schema.type === 'string' && typeof data !== 'string') {
      errors.push('Expected string type');
    } else if (schema.type === 'number' && typeof data !== 'number') {
      errors.push('Expected number type');
    } else if (schema.type === 'boolean' && typeof data !== 'boolean') {
      errors.push('Expected boolean type');
    }

    // Required fields validation
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data[field] === undefined) {
          errors.push(`Required field missing: ${field}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private detectSuspiciousPatterns(data: any): string[] {
    const patterns: string[] = [];
    
    const dataStr = JSON.stringify(data).toLowerCase();
    
    // Check for SQL injection patterns
    if (dataStr.includes('select') || dataStr.includes('insert') || dataStr.includes('update') || dataStr.includes('delete')) {
      patterns.push('sql_injection');
    }
    
    // Check for script injection patterns
    if (dataStr.includes('<script') || dataStr.includes('javascript:')) {
      patterns.push('script_injection');
    }
    
    // Check for command injection patterns
    if (dataStr.includes(';') || dataStr.includes('&&') || dataStr.includes('||')) {
      patterns.push('command_injection');
    }
    
    return patterns;
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
} 