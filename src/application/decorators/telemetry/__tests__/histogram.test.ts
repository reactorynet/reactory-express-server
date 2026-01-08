import { histogram } from '../histogram';
import Reactory from '@reactory/reactory-core';

describe('@histogram decorator', () => {
  let mockContext: Reactory.Server.IReactoryContext;
  let telemetryMock: any;

  beforeEach(() => {
    const endTimerMock = jest.fn();
    
    telemetryMock = {
      increment: jest.fn(),
      startTimer: jest.fn().mockReturnValue(endTimerMock),
    };

    mockContext = {
      telemetry: telemetryMock,
      partner: { id: 'partner-123', key: 'test-partner' },
      user: { id: 'user-456' },
    } as any;
  });

  it('should track method duration', async () => {
    class TestService {
      @histogram('test.duration')
      async testMethod(context: any) {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod(mockContext);

    expect(telemetryMock.startTimer).toHaveBeenCalledWith(
      'test.duration.duration',
      expect.objectContaining({
        partnerId: 'partner-123',
      }),
      expect.objectContaining({
        unit: 'seconds',
      })
    );
  });

  it('should call endTimer after method completes', async () => {
    const endTimerMock = jest.fn();
    telemetryMock.startTimer.mockReturnValue(endTimerMock);

    class TestService {
      @histogram('test.duration')
      async testMethod(context: any) {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod(mockContext);

    expect(endTimerMock).toHaveBeenCalled();
  });

  it('should call endTimer even when method throws', async () => {
    const endTimerMock = jest.fn();
    telemetryMock.startTimer.mockReturnValue(endTimerMock);
    telemetryMock.increment = jest.fn(); // For error tracking

    class TestService {
      @histogram('test.duration')
      async testMethod(context: any) {
        throw new Error('Test error');
      }
    }

    const service = new TestService();
    
    await expect(service.testMethod(mockContext)).rejects.toThrow();

    expect(endTimerMock).toHaveBeenCalled();
  });
});
