/* eslint-disable class-methods-use-this */
import { StepBody, ExecutionResult } from 'workflow-es';
import { clearCache } from '@reactory/server-modules/lasec/models';

import logger from '@reactory/server-core/logging';


class BeforeInvalidate extends StepBody {
  run(context) {
    // console.log('Running Before Login', { date: new Date().valueOf() });
    logger.debug('LasecCache.BeforeInvalidate');
    return ExecutionResult.next();
  }
}

class Invalidate extends StepBody {
  run(context) {
    // console.log('After Loging', { date: new Date().valueOf() });
    logger.debug('LasecCache.Invalidate');
    clearCache();
    return ExecutionResult.next();
  }
}

class LasecCacheInvalidate {
  constructor() {
    this.id = LasecCacheInvalidate.meta.id;
    this.version = 1;
    this.build = this.build.bind(this);
  }

  build(builder) {
    // console.log('building', builder);
    builder
      .startWith(BeforeInvalidate)
      .input((step, data) => { step.props = { ...data }; })
      .then(Invalidate);
  }
}

LasecCacheInvalidate.meta = {
  nameSpace: 'lasec-crm',
  name: 'LasecCacheInvalidate',
  version: '1.0.0',
  component: LasecCacheInvalidate,
  category: 'workflow',
  id: 'LasecCacheInvalidate',
  autoStart: true,
  props: {
    interval: 1000 * 30,
    enabled: true,
  }
};


export default LasecCacheInvalidate;

