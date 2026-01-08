import { metric } from '../metric';
import Reactory from '@reactory/reactory-core';

describe('@metric decorator', () => {
  let mockContext: Reactory.Server.IReactoryContext;
  let telemetryMock: any;

  beforeEach(() => {
    telemetryMock = {
      increment: jest.fn(),
      startTimer: jest.fn().mockReturnValue(jest.fn()),
      recordHistogram: jest.fn(),
      recordGauge: jest.fn(),
    };

    mockContext = {
      telemetry: telemetryMock,
      partner: { id: 'partner-123', key: 'test-partner' },
      user: { id: 'user-456' },
    } as any;
  });

  describe('method invocation tracking', () => {
    it('should track method invocations with counter', async () => {
      class TestService {
        @metric('test.operation', { type: 'counter' })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        'test.operation.count',
        1,
        expect.objectContaining({
          partnerId: 'partner-123',
          partnerKey: 'test-partner',
          userId: 'user-456',
        }),
        expect.objectContaining({
          description: 'test.operation metric - invocations',
          unit: 'count',
        })
      );
    });

    it('should track successful completions', async () => {
      class TestService {
        @metric('test.operation')
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        'test.operation.success',
        1,
        expect.any(Object),
        expect.objectContaining({
          description: 'test.operation metric - successful operations',
        })
      );
    });
  });

  describe('duration tracking', () => {
    it('should track method duration with histogram', async () => {
      const endTimerMock = jest.fn();
      telemetryMock.startTimer.mockReturnValue(endTimerMock);

      class TestService {
        @metric('test.operation', { trackDuration: true })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.startTimer).toHaveBeenCalledWith(
        'test.operation.duration',
        expect.objectContaining({
          partnerId: 'partner-123',
        }),
        expect.objectContaining({
          description: 'test.operation metric - duration',
          unit: 'seconds',
        })
      );

      expect(endTimerMock).toHaveBeenCalled();
    });

    it('should not track duration when trackDuration is false', async () => {
      class TestService {
        @metric('test.operation', { trackDuration: false })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.startTimer).not.toHaveBeenCalled();
    });
  });

  describe('error tracking', () => {
    it('should track errors and classify them', async () => {
      class TestService {
        @metric('test.operation', { trackErrors: true })
        async testMethod(context: any) {
          throw new TypeError('Test error');
        }
      }

      const service = new TestService();
      
      await expect(service.testMethod(mockContext)).rejects.toThrow('Test error');

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        'test.operation.errors',
        1,
        expect.objectContaining({
          errorType: 'TypeError',
        }),
        expect.any(Object)
      );

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        'test.operation.errors.TypeError',
        1,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should use custom error classifier', async () => {
      class TestService {
        @metric('test.operation', {
          trackErrors: true,
          errorClassifier: (error) => {
            if (error.message.includes('network')) return 'NetworkError';
            return 'UnknownError';
          },
        })
        async testMethod(context: any) {
          throw new Error('network timeout');
        }
      }

      const service = new TestService();
      
      await expect(service.testMethod(mockContext)).rejects.toThrow();

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        'test.operation.errors',
        1,
        expect.objectContaining({
          errorType: 'NetworkError',
        }),
        expect.any(Object)
      );
    });

    it('should not track errors when trackErrors is false', async () => {
      class TestService {
        @metric('test.operation', { trackErrors: false })
        async testMethod(context: any) {
          throw new Error('Test error');
        }
      }

      const service = new TestService();
      
      await expect(service.testMethod(mockContext)).rejects.toThrow();

      // Should not call increment with error metrics
      expect(telemetryMock.increment).not.toHaveBeenCalledWith(
        expect.stringContaining('errors'),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('custom attributes', () => {
    it('should extract custom attributes from method arguments', async () => {
      class TestService {
        @metric('test.operation', {
          attributesExtractor: (args) => ({
            channel: args[0]?.channel,
            priority: args[0]?.priority,
          }),
        })
        async testMethod(input: any, context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod({ channel: 'email', priority: 'high' }, mockContext);

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          channel: 'email',
          priority: 'high',
          partnerId: 'partner-123',
        }),
        expect.any(Object)
      );
    });

    it('should include static tags', async () => {
      class TestService {
        @metric('test.operation', {
          tags: { module: 'test', operation: 'testMethod' },
        })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          module: 'test',
          operation: 'testMethod',
        }),
        expect.any(Object)
      );
    });
  });

  describe('sampling', () => {
    it('should respect sampling rate', async () => {
      // Mock Math.random to always return 0.5
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      class TestService {
        @metric('test.operation', { samplingRate: 0.3 })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      // Should not track because 0.5 > 0.3
      expect(telemetryMock.increment).not.toHaveBeenCalled();

      Math.random = originalRandom;
    });

    it('should track when within sampling rate', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1);

      class TestService {
        @metric('test.operation', { samplingRate: 0.5 })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      // Should track because 0.1 <= 0.5
      expect(telemetryMock.increment).toHaveBeenCalled();

      Math.random = originalRandom;
    });
  });

  describe('context extraction', () => {
    it('should extract context from params (default)', async () => {
      class TestService {
        @metric('test.operation')
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalled();
    });

    it('should extract context from instance', async () => {
      class TestService {
        context: any;

        constructor(context: any) {
          this.context = context;
        }

        @metric('test.operation', { contextSource: 'instance' })
        async testMethod() {
          return 'success';
        }
      }

      const service = new TestService(mockContext);
      await service.testMethod();

      expect(telemetryMock.increment).toHaveBeenCalled();
    });

    it('should extract context from request object', async () => {
      class TestController {
        @metric('test.operation', { contextSource: 'request' })
        async handleRequest(req: any) {
          return 'success';
        }
      }

      const controller = new TestController();
      await controller.handleRequest({ context: mockContext });

      expect(telemetryMock.increment).toHaveBeenCalled();
    });

    it('should handle missing context gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      class TestService {
        @metric('test.operation')
        async testMethod() {
          return 'success';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('success');
      expect(telemetryMock.increment).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('metric types', () => {
    it('should track only counter when type is counter', async () => {
      class TestService {
        @metric('test.operation', { type: 'counter' })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalled();
      expect(telemetryMock.startTimer).not.toHaveBeenCalled();
    });

    it('should track only histogram when type is histogram', async () => {
      class TestService {
        @metric('test.operation', { type: 'histogram', trackDuration: true })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.startTimer).toHaveBeenCalled();
      expect(telemetryMock.increment).not.toHaveBeenCalledWith(
        'test.operation.count',
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should track both counter and histogram when type is all', async () => {
      const endTimerMock = jest.fn();
      telemetryMock.startTimer.mockReturnValue(endTimerMock);

      class TestService {
        @metric('test.operation', { type: 'all' })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalled();
      expect(telemetryMock.startTimer).toHaveBeenCalled();
      expect(endTimerMock).toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should set persist option to true by default', async () => {
      class TestService {
        @metric('test.operation')
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Object),
        expect.objectContaining({
          persist: true,
        })
      );
    });

    it('should respect persist option when set to false', async () => {
      class TestService {
        @metric('test.operation', { persist: false })
        async testMethod(context: any) {
          return 'success';
        }
      }

      const service = new TestService();
      await service.testMethod(mockContext);

      expect(telemetryMock.increment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Object),
        expect.objectContaining({
          persist: false,
        })
      );
    });
  });
});
