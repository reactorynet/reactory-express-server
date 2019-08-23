import { StepBody, ExecutionResult } from 'workflow-es';
import moment from 'moment';
import logger from '../../logging';


class BeforeStartup extends StepBody {
  run(context) {
    logger.debug(`Before Startup ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);
    return ExecutionResult.next();
  }
}


class AfterStartup extends StepBody {
  run(context) {
    logger.debug(`After Startup ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);
    return ExecutionResult.next();
  }
}


class StartupWorkflow {
  constructor() {
    this.id = 'reactory.StartupWorkflow';
    this.version = 1;
  }

  build(builder) {
    // console.log('building', builder);
    builder
      .startWith(BeforeStartup).input((step, data) => {
        step.when = data.when;
      })
      .then(AfterStartup).input((step, data) => {
        step.when = data.when;
      });
  }
}

export default StartupWorkflow;

