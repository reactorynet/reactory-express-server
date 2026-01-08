import { gauge } from '../gauge';
import Reactory from '@reactory/reactory-core';

describe('@gauge decorator', () => {
  let mockContext: Reactory.Server.IReactoryContext;
  let telemetryMock: any;

  beforeEach(() => {
    telemetryMock = {
      recordGauge: jest.fn(),
    };

    mockContext = {
      telemetry: telemetryMock,
      partner: { id: 'partner-123', key: 'test-partner' },
      user: { id: 'user-456' },
    } as any;
  });

  it('should record gauge value when method returns number', async () => {
    class TestService {
      @gauge('test.queue.depth')
      async getQueueDepth(context: any): Promise<number> {
        return 42;
      }
    }

    const service = new TestService();
    await service.getQueueDepth(mockContext);

    expect(telemetryMock.recordGauge).toHaveBeenCalledWith(
      'test.queue.depth',
      42,
      expect.objectContaining({
        partnerId: 'partner-123',
      }),
      expect.any(Object)
    );
  });

  it('should use custom value extractor', async () => {
    class TestService {
      @gauge('test.active.connections', {
        valueExtractor: (result) => result.activeConnections,
      })
      async getStatus(context: any) {
        return { activeConnections: 15, totalRequests: 100 };
      }
    }

    const service = new TestService();
    await service.getStatus(mockContext);

    expect(telemetryMock.recordGauge).toHaveBeenCalledWith(
      'test.active.connections',
      15,
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should include custom attributes', async () => {
    class TestService {
      @gauge('test.queue.depth', {
        attributesExtractor: (args) => ({ priority: args[0] }),
      })
      async getQueueDepth(priority: string, context: any): Promise<number> {
        return 10;
      }
    }

    const service = new TestService();
    await service.getQueueDepth('high', mockContext);

    expect(telemetryMock.recordGauge).toHaveBeenCalledWith(
      'test.queue.depth',
      10,
      expect.objectContaining({
        priority: 'high',
        partnerId: 'partner-123',
      }),
      expect.any(Object)
    );
  });

  it('should handle missing context gracefully', async () => {
    class TestService {
      @gauge('test.metric')
      async testMethod(): Promise<number> {
        return 5;
      }
    }

    const service = new TestService();
    const result = await service.testMethod();

    expect(result).toBe(5);
    expect(telemetryMock.recordGauge).not.toHaveBeenCalled();
  });
});
