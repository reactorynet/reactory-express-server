/* eslint-disable class-methods-use-this */
import { StepBody, ExecutionResult } from 'workflow-es';
import logger from '../../../logging';


class BeforeInvalidate extends StepBody {
  run(context) {
    // console.log('Running Before Login', { date: new Date().valueOf() });
    logger.debug('Before Client Invalidate Workflow');
    return ExecutionResult.next();
  }
}

class Invalidate extends StepBody {
  run(context) {
    // console.log('After Loging', { date: new Date().valueOf() });
    logger.debug('Before Client Invalidate Workflow');
    return ExecutionResult.next();
  }
}


class AfterInvalidate extends StepBody {
  run(context) {
    // console.log('After Loging', { date: new Date().valueOf() });
    const { quote_id } = this;
    logger.debug('Client {id} invalidate cache');
    return ExecutionResult.next();
  }
}

class Synchronize extends StepBody {
  run(context) {
    logger.debug('Before Quote Invalidate Workflow');
    return ExecutionResult.next();
  }
}

class AfterSynchronize extends StepBody {
  run(context) {
    logger.debug('Before Quote Invalidate Workflow');
    return ExecutionResult.outcome('true');
  }
}

class LasecQuoteCacheInvalidate {
  constructor() {
    this.id = 'LasecQuoteCacheInvalidate';
    this.version = 1;
    this.build = this.build.bind(this);
  }

  build(builder) {
    // console.log('building', builder);
    builder
      .startWith(BeforeInvalidate)
      .input((step, data) => { step.props = { ...data }; })
      .then(Invalidate)
      .input((step, data) => { step.props = { ...data }; })
      .then(AfterInvalidate)
      .input((step, data) => { step.props = { ...data }; })
      .then(Synchronize)
      .input((step, data) => { step.props = { ...data }; })
      .then(AfterSynchronize)
      .input((step, data) => { step.props = { ...data }; });
  }
}

LasecQuoteCacheInvalidate.meta = {
  nameSpace: 'lasec-crm',
  name: 'LasecClientCacheInvalidate',
  version: '1.0.0',
  component: LasecQuoteCacheInvalidate,
  category: 'workflow',
};


export default LasecQuoteCacheInvalidate;

