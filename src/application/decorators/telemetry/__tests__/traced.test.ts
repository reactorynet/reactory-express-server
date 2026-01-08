import { traced } from '../traced';
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(),
  },
  SpanStatusCode: {
    OK: 0,
    ERROR: 2,
  },
  SpanKind: {
    INTERNAL: 0,
    SERVER: 1,
    CLIENT: 2,
    PRODUCER: 3,
    CONSUMER: 4,
  },
}));

describe('@traced decorator', () => {
  let spanMock: any;
  let tracerMock: any;

  beforeEach(() => {
    spanMock = {
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    };

    tracerMock = {
      startSpan: jest.fn().mockReturnValue(spanMock),
    };

    (trace.getTracer as jest.Mock).mockReturnValue(tracerMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a span for method execution', async () => {
    class TestService {
      @traced('test.operation')
      async testMethod() {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod();

    expect(tracerMock.startSpan).toHaveBeenCalledWith(
      'test.operation',
      expect.objectContaining({
        kind: SpanKind.INTERNAL,
      })
    );
  });

  it('should set span status to OK on success', async () => {
    class TestService {
      @traced('test.operation')
      async testMethod() {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod();

    expect(spanMock.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.OK,
    });
    expect(spanMock.end).toHaveBeenCalled();
  });

  it('should set span status to ERROR on failure', async () => {
    class TestService {
      @traced('test.operation')
      async testMethod() {
        throw new Error('Test error');
      }
    }

    const service = new TestService();
    
    await expect(service.testMethod()).rejects.toThrow('Test error');

    expect(spanMock.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'Test error',
    });
    expect(spanMock.end).toHaveBeenCalled();
  });

  it('should record exception when recordException is true', async () => {
    class TestService {
      @traced('test.operation', { recordException: true })
      async testMethod() {
        throw new Error('Test error');
      }
    }

    const service = new TestService();
    
    await expect(service.testMethod()).rejects.toThrow();

    expect(spanMock.recordException).toHaveBeenCalledWith(
      expect.any(Error)
    );
  });

  it('should not record exception when recordException is false', async () => {
    class TestService {
      @traced('test.operation', { recordException: false })
      async testMethod() {
        throw new Error('Test error');
      }
    }

    const service = new TestService();
    
    await expect(service.testMethod()).rejects.toThrow();

    expect(spanMock.recordException).not.toHaveBeenCalled();
  });

  it('should include custom attributes in span', async () => {
    class TestService {
      @traced('test.operation', {
        attributes: { module: 'test', operation: 'testMethod' },
      })
      async testMethod() {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod();

    expect(tracerMock.startSpan).toHaveBeenCalledWith(
      'test.operation',
      expect.objectContaining({
        attributes: { module: 'test', operation: 'testMethod' },
      })
    );
  });

  it('should support different span kinds', async () => {
    class TestService {
      @traced('test.operation', { kind: 'server' })
      async testMethod() {
        return 'success';
      }
    }

    const service = new TestService();
    await service.testMethod();

    expect(tracerMock.startSpan).toHaveBeenCalledWith(
      'test.operation',
      expect.objectContaining({
        kind: SpanKind.SERVER,
      })
    );
  });

  it('should end span even when method throws', async () => {
    class TestService {
      @traced('test.operation')
      async testMethod() {
        throw new Error('Test error');
      }
    }

    const service = new TestService();
    
    await expect(service.testMethod()).rejects.toThrow();

    expect(spanMock.end).toHaveBeenCalled();
  });
});
