import { StepBody, ExecutionResult } from 'workflow-es';
import moment from 'moment';
import Cache from '@reactory/server-modules/core/models/CoreCache';
import logger from '@reactory/server-core/logging';

class BeforeCacheClean extends StepBody {
  run(context) {
    logger.debug(`WF: Before Clean ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);
    return ExecutionResult.next();
  }
}


class CleanCache extends StepBody {
  run(context) {
    Cache.clean();
    logger.debug(`WF: Cleaning Cache ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);      
    return ExecutionResult.next();
  }
}

class AfterCacheClean extends StepBody {
  run(context) {
    logger.debug(`WF: After Cache Clean ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);    
    return ExecutionResult.next();
  }
}


class CleanCacheWorkflow {

  id: string
  version: number

  constructor() {
    this.id = 'core.CleanCacheWorkflow';
    this.version = 1;
  }

  build(builder) {
    // console.log('building', builder);
    builder
      .startWith(BeforeCacheClean).input((step, data) => {
        step.when = data.when;
        step.props = data.props;
      }).then(CleanCache).input((step, data) => {
          step.when = moment().valueOf();          
          Cache.clean();
          step.props = data.props;
      }).then(AfterCacheClean).input(( step, data) => {
          step.when = moment().valueOf();
          step.props = data.props;
      });                   
  }

  static meta = {};
}

CleanCacheWorkflow.meta = {
  nameSpace: 'core',
  name: 'CleanCacheWorkflow',
  version: '1.0.0',
  component: CleanCacheWorkflow,
  category: 'workflow',
  autoStart: true,
  props: {
    interval: 1000 * 30,
    enabled: true,
  },
  id: 'core.CleanCacheWorkflow',
};

export default CleanCacheWorkflow;

