import amq, { DEFAULT_CHANNELS, $chan, $sub, $pub } from '../index';
import express from 'express';
import request from 'supertest';

describe('AMQ (Asynchronous Message Queue)', () => {
  describe('$chan function', () => {
    it('should create a channel without partner', () => {
      const channel = $chan('test');
      expect(channel).toBeDefined();
      expect(typeof channel.subscribe).toBe('function');
      expect(typeof channel.publish).toBe('function');
    });

    it('should create a namespaced channel with partner', () => {
      const partner = { key: 'testpartner' } as any;
      const channel = $chan('test', partner);
      expect(channel).toBeDefined();
      // Note: postal.js internally handles namespacing, we can't easily test the name
    });

    it('should handle partner without key', () => {
      const partner = {} as any;
      const channel = $chan('test', partner);
      expect(channel).toBeDefined();
    });
  });

  describe('Subscription and Publishing', () => {
    let receivedData: any;
    let receivedEnvelope: any;
    let subscription: any;

    beforeEach(() => {
      receivedData = null;
      receivedEnvelope = null;
    });

    afterEach(() => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });

    describe('Custom channel ($sub.def and $pub.def)', () => {
      it('should subscribe and publish on custom channel', (done) => {
        subscription = $sub.def('test.event', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        }, 'custom');

        $pub.def('test.event', { message: 'hello' }, 'custom');
      });
    });

    describe('Transactions channel', () => {
      it('should subscribe and publish transaction events', (done) => {
        subscription = $sub.transactions('transaction.created', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.transactions('transaction.created', { id: '123', amount: 100 });
      });
    });

    describe('File channel', () => {
      it('should subscribe and publish file events', (done) => {
        subscription = $sub.file('file.uploaded', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.file('file.uploaded', { filename: 'test.txt', size: 1024 });
      });
    });

    describe('Data channel', () => {
      it('should subscribe and publish data events', (done) => {
        subscription = $sub.data('data.updated', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.data('data.updated', { entity: 'user', id: '456' });
      });
    });

    describe('Metrics channel', () => {
      it('should subscribe and publish metrics events', (done) => {
        subscription = $sub.metrics('metric.recorded', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.metrics('metric.recorded', { name: 'response_time', value: 150 });
      });
    });

    describe('Form Command channel', () => {
      it('should subscribe and publish form command events', (done) => {
        subscription = $sub.formCommand('form.submit', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.formCommand('form.submit', { formId: 'contact', data: {} });
      });
    });

    describe('Workflow channel', () => {
      it('should subscribe and publish workflow events', (done) => {
        subscription = $sub.workFlow('workflow.started', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.workFlow('workflow.started', { workflowId: 'approval', instanceId: '789' });
      });
    });

    describe('Message Handler Loaded channel', () => {
      it('should subscribe and publish message handler loaded events', (done) => {
        subscription = $sub.messageHandlerLoaded('handler.loaded', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.messageHandlerLoaded('handler.loaded', { handler: 'email', version: '1.0' });
      });
    });

    describe('Plugin Loaded channel', () => {
      it('should subscribe and publish plugin loaded events', (done) => {
        subscription = $sub.pluginLoaded('plugin.loaded', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.pluginLoaded('plugin.loaded', { plugin: 'calendar', version: '2.0' });
      });
    });

    describe('System channel', () => {
      it('should subscribe and publish system events', (done) => {
        subscription = $sub.system('system.startup', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        });

        $pub.system('system.startup', { timestamp: Date.now() });
      });
    });

    describe('Partner namespacing', () => {
      it('should handle partner-specific channels', (done) => {
        const partner = { key: 'partner1' } as any;
        subscription = $sub.transactions('transaction.created', (data: any, envelope: any) => {
          receivedData = data;
          receivedEnvelope = envelope;
          done();
        }, partner);

        $pub.transactions('transaction.created', { id: '123' }, partner);
      });
    });

    describe('Unsubscribing', () => {
      it('should stop receiving events after unsubscribe', (done) => {
        let callCount = 0;
        const callback = () => {
          callCount++;
        };
        subscription = $sub.data('data.updated', callback);

        $pub.data('data.updated', {});

        setTimeout(() => {
          subscription.unsubscribe();
          $pub.data('data.updated', {});
          setTimeout(() => {
            expect(callCount).toBe(1);
            done();
          }, 50);
        }, 50);
      });
    });
  });

  describe('AMQ API aliases', () => {
    it('should have correct aliases for subscriptions', () => {
      expect(amq.onTransactionEvent).toBe($sub.transactions);
      expect(amq.onFileEvent).toBe($sub.file);
      expect(amq.onDataEvent).toBe($sub.data);
      expect(amq.onMetricEvent).toBe($sub.metrics);
      expect(amq.onFormCommandEvent).toBe($sub.formCommand);
      expect(amq.onWorkflowEvent).toBe($sub.workFlow);
      expect(amq.onMessageHandlerLoaded).toBe($sub.messageHandlerLoaded);
      expect(amq.onReactoryPluginLoaded).toBe($sub.pluginLoaded);
      expect(amq.onReactoryPluginEvent).toBe($sub.pluginLoaded);
    });

    it('should have correct aliases for publications', () => {
      expect(amq.raiseTransactionEvent).toBe($pub.transactions);
      expect(amq.raiseFileEvent).toBe($pub.file);
      expect(amq.raiseDataEvent).toBe($pub.data);
      expect(amq.raiseMetricEvent).toBe($pub.metrics);
      expect(amq.raiseFormCommand).toBe($pub.formCommand);
      expect(amq.raiseWorkflowEvent).toBe($pub.workFlow);
      expect(amq.raiseWorkFlowEvent).toBe($pub.workFlow);
      expect(amq.raiseMessageHandlerLoadedEvent).toBe($pub.messageHandlerLoaded);
      expect(amq.raiseReactoryPluginEvent).toBe($pub.pluginLoaded);
      expect(amq.raiseSystemEvent).toBe($pub.system);
    });
  });

  describe('Express Router', () => {
    let app: express.Application;

    beforeAll(() => {
      app = express();
      app.use('/', amq.router);
    });

    it('should respond to GET /', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, message: 'POSTAL-OK' });
    });

    it('should respond to POST /', async () => {
      const response = await request(app).post('/');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, message: 'POSTAL-OK' });
    });
  });

  describe('DEFAULT_CHANNELS', () => {
    it('should have all expected channel constants', () => {
      expect(DEFAULT_CHANNELS.SYSTEM).toBe('reactory.core');
      expect(DEFAULT_CHANNELS.DATA).toBe('data');
      expect(DEFAULT_CHANNELS.METRICS).toBe('metrics');
      expect(DEFAULT_CHANNELS.TRANSACTIONS).toBe('transactions');
      expect(DEFAULT_CHANNELS.FILE).toBe('file');
      expect(DEFAULT_CHANNELS.FORM_COMMAND).toBe('form.command');
      expect(DEFAULT_CHANNELS.WORKFLOW).toBe('workflow');
      expect(DEFAULT_CHANNELS.CROSS_ORIGIN).toBe('cross_origin');
      expect(DEFAULT_CHANNELS.PLUGINS).toBe('reactory.plugins');
    });
  });
});