import { counter } from '../counter';
import Reactory from '@reactory/reactory-core';

describe('@counter decorator', () => {
  let mockContext: Reactory.Server.IReactoryContext;
  let telemetryMock: any;

  beforeEach(() => {
    telemetryMock = {
      increment: jest.fn(),
      startTimer: jest.fn(),
    };

    mockContext = {
      telemetry: telemetryMock,
      partner: { id: 'partner-123', key: 'test-partner' },
      user: { id: 'user-456' },
    } as any;
  });

  it('should track method invocations', async () => {
    class TestService {
      @counter('test.counter')
      async testMethod(context: any) {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod(mockContext);

    expect(telemetryMock.increment).toHaveBeenCalledWith(
      'test.counter.count',
      1,
      expect.objectContaining({
        partnerId: 'partner-123',
      }),
      expect.any(Object)
    );
  });

  it('should not track duration', async () => {
    class TestService {
      @counter('test.counter')
      async testMethod(context: any) {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod(mockContext);

    expect(telemetryMock.startTimer).not.toHaveBeenCalled();
  });

  it('should support custom attributes', async () => {
    class TestService {
      @counter('test.counter', {
        attributesExtractor: (args) => ({ operation: args[0] }),
      })
      async testMethod(operation: string, context: any) {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod('create', mockContext);

    expect(telemetryMock.increment).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.objectContaining({
        operation: 'create',
      }),
      expect.any(Object)
    );
  });
});
