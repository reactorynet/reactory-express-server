import { StepBody, ExecutionResult } from 'workflow-es';
import Cache from '../models/CoreCache';
import moment from 'moment';
import logger from '../../../logging';
import amq from '../../../amq';

class BeforeCacheClean extends StepBody {
  run(context) {
    logger.debug(`WF: Before Clean ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);
    return ExecutionResult.next();
  }
}


class CleanCache extends StepBody {
  run(context) {
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
}

CleanCacheWorkflow.meta = {
  nameSpace: 'core',
  name: 'CleanCacheWorkflow',
  version: '1.0.0',
  component: CleanCacheWorkflow,
  category: 'workflow',
  autoStart: true,
  props: {
    interval: 3600,
    enabled: true,
  },
  id: 'core.CleanCacheWorkflow',
};

export default CleanCacheWorkflow;

