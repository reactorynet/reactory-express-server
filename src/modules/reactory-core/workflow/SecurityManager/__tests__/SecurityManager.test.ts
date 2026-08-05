import { SecurityManager, IUser, IWorkflowPermission, IInputValidationResult } from '../SecurityManager';

// Mock logging
jest.mock('../../../../../logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      auditLogEnabled: true,
      auditLogRetention: 90,
      securityEventsEnabled: true,
      rateLimitingEnabled: true,
      inputValidationEnabled: true,
      encryptionEnabled: false,
      allowedOrigins: ['*'],
      maxRequestSize: 1024 * 1024,
      sessionTimeout: 30 * 60 * 1000
    };

    securityManager = new SecurityManager(mockConfig);
  });

  afterEach(async () => {
    if (securityManager && securityManager.isInitialized()) {
      await securityManager.stop();
    }
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new SecurityManager({
        auditLogEnabled: true,
        auditLogRetention: 30,
        securityEventsEnabled: true,
        rateLimitingEnabled: true,
        inputValidationEnabled: true,
        encryptionEnabled: false,
        allowedOrigins: ['*'],
        maxRequestSize: 1024,
        sessionTimeout: 60000
      });

      expect(manager).toBeInstanceOf(SecurityManager);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        ...mockConfig,
        auditLogEnabled: false,
        rateLimitingEnabled: false,
        inputValidationEnabled: false
      };

      const manager = new SecurityManager(customConfig);
      expect(manager).toBeInstanceOf(SecurityManager);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await securityManager.initialize();
      expect(securityManager.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await securityManager.initialize();
      await securityManager.initialize(); // Should not throw
      expect(securityManager.isInitialized()).toBe(true);
    });

    // ISecurityStats no longer carries totalUsers/totalWorkflowPermissions —
    // these assertions used to read those removed counters and got `undefined`.
    // The sample data is now observed through behaviour instead.
    it('should load sample users and permissions', async () => {
      await securityManager.initialize();

      // A sample user against a sample workflow permission is authorised...
      await expect(
        securityManager.checkWorkflowPermission('admin', 'reactory.StartupWorkflow', '1.0.0')
      ).resolves.toBe(true);
      // ...and an unknown user is not.
      await expect(
        securityManager.checkWorkflowPermission('nobody', 'reactory.StartupWorkflow', '1.0.0')
      ).resolves.toBe(false);
      // Sample workflow permissions are reflected in the active permission set.
      expect(securityManager.getSecurityStats().activePermissions).toContain('workflow.execute');
    });
  });

  describe('workflow permission checking', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should allow admin user to execute workflow', async () => {
      const hasPermission = await securityManager.checkWorkflowPermission(
        'admin',
        'reactory.StartupWorkflow',
        '1.0.0'
      );
      expect(hasPermission).toBe(true);
    });

    it('should allow user with specific permission', async () => {
      const hasPermission = await securityManager.checkWorkflowPermission(
        'user1',
        'reactory.DataProcessingWorkflow',
        '1.0.0'
      );
      expect(hasPermission).toBe(true);
    });

    it('should deny inactive user', async () => {
      const hasPermission = await securityManager.checkWorkflowPermission(
        'user2', // inactive user
        'reactory.StartupWorkflow',
        '1.0.0'
      );
      expect(hasPermission).toBe(false);
    });

    it('should deny non-existent user', async () => {
      const hasPermission = await securityManager.checkWorkflowPermission(
        'non-existent',
        'reactory.StartupWorkflow',
        '1.0.0'
      );
      expect(hasPermission).toBe(false);
    });

    it('should allow workflow without specific permissions', async () => {
      const hasPermission = await securityManager.checkWorkflowPermission(
        'user1',
        'workflow.without.permissions',
        '1.0.0'
      );
      expect(hasPermission).toBe(true);
    });
  });

  describe('input validation', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should validate correct input', () => {
      const validData = {
        name: 'test',
        value: 123,
        enabled: true
      };

      const result = securityManager.validateInput(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject oversized data', () => {
      const largeData = {
        data: 'x'.repeat(2 * 1024 * 1024) // 2MB string
      };

      const result = securityManager.validateInput(largeData);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Data size exceeds limit');
    });

    it('should sanitize XSS content', () => {
      const dataWithXSS = {
        name: '<script>alert("xss")</script>',
        description: 'Normal text'
      };

      const result = securityManager.validateInput(dataWithXSS);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Data was sanitized for security');
      expect(result.sanitizedData).toBeDefined();
    });

    it('should detect suspicious patterns', () => {
      const suspiciousData = {
        query: 'SELECT * FROM users; DROP TABLE users;',
        script: '<script>alert("test")</script>',
        command: 'rm -rf /;'
      };

      const result = securityManager.validateInput(suspiciousData);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Suspicious patterns detected'))).toBe(true);
    });

    it('should validate against schema', () => {
      const data = {
        name: 'test',
        age: 25
      };

      const schema = {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      const result = securityManager.validateInput(data, schema);
      expect(result.isValid).toBe(true);
    });

    it('should reject data that violates schema', () => {
      const data = {
        name: 'test'
        // Missing required 'age' field
      };

      const schema = {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      const result = securityManager.validateInput(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Required field missing: age');
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should allow requests within limit', () => {
      const limitInfo = securityManager.checkRateLimit('user1', 10, 60000);
      
      expect(limitInfo.current).toBe(1);
      expect(limitInfo.limit).toBe(10);
      expect(limitInfo.window).toBe(60000);
    });

    it('should track multiple requests', () => {
      // First request
      let limitInfo = securityManager.checkRateLimit('user1', 10, 60000);
      expect(limitInfo.current).toBe(1);

      // Second request
      limitInfo = securityManager.checkRateLimit('user1', 10, 60000);
      expect(limitInfo.current).toBe(2);
    });

    it('should reset after window expires', () => {
      // First request
      let limitInfo = securityManager.checkRateLimit('user1', 10, 60000);
      expect(limitInfo.current).toBe(1);

      // Simulate time passing by manipulating the internal state
      const rateLimitStore = (securityManager as any).rateLimitStore;
      const key = 'rate_limit:user1';
      const current = rateLimitStore.get(key);
      if (current) {
        current.resetTime = new Date(Date.now() - 1000); // Expired
      }

      // Next request should reset
      limitInfo = securityManager.checkRateLimit('user1', 10, 60000);
      expect(limitInfo.current).toBe(1);
    });

    it('should create security event when limit exceeded', () => {
      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        securityManager.checkRateLimit('user1', 10, 60000);
      }

      const events = securityManager.getSecurityEvents({ type: 'rate_limit_exceeded' });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('audit logging', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should log audit events', async () => {
      await securityManager.logAuditEvent(
        'user1',
        'workflow_start',
        'workflow',
        'test.workflow@1.0.0',
        { result: 'success' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      const logs = securityManager.getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[0];
      expect(lastLog.userId).toBe('user1');
      expect(lastLog.action).toBe('workflow_start');
      expect(lastLog.resource).toBe('workflow');
      expect(lastLog.resourceId).toBe('test.workflow@1.0.0');
      expect(lastLog.success).toBe(true);
    });

    it('should filter audit logs', () => {
      // Add some test logs
      (securityManager as any).auditLog = [
        {
          id: '1',
          timestamp: new Date(),
          userId: 'user1',
          action: 'workflow_start',
          resource: 'workflow',
          resourceId: 'test1',
          details: {},
          success: true
        },
        {
          id: '2',
          timestamp: new Date(),
          userId: 'user2',
          action: 'workflow_stop',
          resource: 'workflow',
          resourceId: 'test2',
          details: {},
          success: false
        }
      ];

      const user1Logs = securityManager.getAuditLogs({ userId: 'user1' });
      expect(user1Logs.length).toBe(1);
      expect(user1Logs[0].userId).toBe('user1');

      const failedLogs = securityManager.getAuditLogs({ action: 'workflow_stop' });
      expect(failedLogs.length).toBe(1);
      expect(failedLogs[0].action).toBe('workflow_stop');
    });
  });

  describe('security events', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should create security events', () => {
      securityManager.createSecurityEvent(
        'permission_denied',
        'medium',
        {
          userId: 'user1',
          workflowId: 'test.workflow',
          reason: 'insufficient_permissions'
        },
        'user1'
      );

      const events = securityManager.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
      
      const lastEvent = events[0];
      expect(lastEvent.type).toBe('permission_denied');
      expect(lastEvent.severity).toBe('medium');
      expect(lastEvent.userId).toBe('user1');
      expect(lastEvent.resolved).toBe(false);
    });

    it('should filter security events', () => {
      // Add some test events
      (securityManager as any).securityEvents = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'permission_denied',
          severity: 'medium',
          userId: 'user1',
          details: {},
          resolved: false
        },
        {
          id: '2',
          timestamp: new Date(),
          type: 'rate_limit_exceeded',
          severity: 'high',
          userId: 'user2',
          details: {},
          resolved: true
        }
      ];

      const unresolvedEvents = securityManager.getSecurityEvents({ resolved: false });
      expect(unresolvedEvents.length).toBe(1);
      expect(unresolvedEvents[0].resolved).toBe(false);

      const highSeverityEvents = securityManager.getSecurityEvents({ severity: 'high' });
      expect(highSeverityEvents.length).toBe(1);
      expect(highSeverityEvents[0].severity).toBe('high');
    });

    it('should resolve security events', () => {
      securityManager.createSecurityEvent(
        'permission_denied',
        'medium',
        { userId: 'user1' },
        'user1'
      );

      const events = securityManager.getSecurityEvents({ resolved: false });
      expect(events.length).toBeGreaterThan(0);

      const eventId = events[0].id;
      securityManager.resolveSecurityEvent(eventId, 'User permissions updated');

      const resolvedEvents = securityManager.getSecurityEvents({ resolved: true });
      expect(resolvedEvents.length).toBeGreaterThan(0);
      expect(resolvedEvents[0].resolution).toBe('User permissions updated');
    });
  });

  describe('user management', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should add user', async () => {
      const newUser: IUser = {
        id: 'newuser',
        username: 'newuser',
        email: 'newuser@example.com',
        roles: ['user'],
        permissions: ['workflow.execute'],
        active: true
      };

      securityManager.addUser(newUser);

      // Observed through behaviour rather than a removed user counter. An
      // unknown id is denied for "user_not_found_or_inactive"; a user that was
      // added is looked up successfully and evaluated against the workflow's
      // permission instead, which is what distinguishes the two.
      const denials = securityManager.getSecurityStats().permissionDenials;
      await securityManager.checkWorkflowPermission(newUser.id, 'reactory.StartupWorkflow', '1.0.0');
      const auditLogs = securityManager.getAuditLogs({ userId: newUser.id });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.some((log: any) => log.details?.reason === 'user_not_found_or_inactive')).toBe(false);
      expect(securityManager.getSecurityStats().permissionDenials).toBeGreaterThanOrEqual(denials);
    });

    it('should remove user', async () => {
      // user1 is a sample user; once removed it can no longer be authorised.
      securityManager.removeUser('user1');

      await expect(
        securityManager.checkWorkflowPermission('user1', 'reactory.StartupWorkflow', '1.0.0')
      ).resolves.toBe(false);
    });
  });

  describe('workflow permission management', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should add workflow permission', async () => {
      const permission: IWorkflowPermission = {
        workflowId: 'test.workflow',
        version: '1.0.0',
        permissions: ['workflow.execute'],
        allowedUsers: ['user1'],
        allowedRoles: ['user'],
        requireAuth: true
      };

      securityManager.addWorkflowPermission(permission);

      // activePermissions is the union of permissions across all registered
      // workflow permissions, so the new entry shows up there.
      expect(securityManager.getSecurityStats().activePermissions).toContain('workflow.execute');
      await expect(
        securityManager.checkWorkflowPermission('user1', 'test.workflow', '1.0.0')
      ).resolves.toBe(true);
    });

    it('should remove workflow permission', async () => {
      // Asserted through the audit trail rather than a count: activePermissions
      // is the flattened union across entries (so removing one of two entries
      // that both grant 'workflow.execute' leaves it unchanged), and
      // checkWorkflowPermission is *permissive* when no entry exists — it
      // records 'no_specific_permissions' and allows. That reason is exactly
      // what distinguishes "entry removed" from "entry present".
      const restricted: IWorkflowPermission = {
        workflowId: 'restricted.workflow',
        version: '1.0.0',
        // A permission the sample users do not hold — they all have
        // 'workflow.execute', which would otherwise satisfy the general-
        // permission branch and allow the call.
        permissions: ['workflow.admin'],
        allowedUsers: ['someone-else'],
        allowedRoles: ['nobody'],
        requireAuth: true
      };
      securityManager.addWorkflowPermission(restricted);

      await expect(
        securityManager.checkWorkflowPermission('user1', 'restricted.workflow', '1.0.0')
      ).resolves.toBe(false);

      securityManager.removeWorkflowPermission('restricted.workflow', '1.0.0');

      // With the entry gone the workflow is unrestricted again.
      await expect(
        securityManager.checkWorkflowPermission('user1', 'restricted.workflow', '1.0.0')
      ).resolves.toBe(true);
    });
  });

  describe('security statistics', () => {
    beforeEach(async () => {
      await securityManager.initialize();
    });

    it('should return correct statistics', () => {
      const stats = securityManager.getSecurityStats();

      // ISecurityStats is {authenticatedRequests, unauthorizedAttempts,
      // permissionDenials, activePermissions, securityEvents}. The old
      // totalUsers/activeUsers/totalWorkflowPermissions/auditLogEntries fields
      // no longer exist, so every assertion here read `undefined`.
      expect(typeof stats.authenticatedRequests).toBe('number');
      expect(typeof stats.unauthorizedAttempts).toBe('number');
      expect(typeof stats.permissionDenials).toBe('number');
      expect(Array.isArray(stats.activePermissions)).toBe(true);
      expect(Array.isArray(stats.securityEvents)).toBe(true);
    });
  });

  describe('stop', () => {
    it('should stop the security manager', async () => {
      await securityManager.initialize();
      await securityManager.stop();
      expect(securityManager.isInitialized()).toBe(false);
    });

    it('should handle stop errors gracefully', async () => {
      expect(async () => {
        await securityManager.stop();
      }).not.toThrow();
    });
  });
}); 