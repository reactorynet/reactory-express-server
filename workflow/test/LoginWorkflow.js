import { StepBody } from 'workflow-es';
import logger from '../../logging/index';

class AfterLogin extends StepBody {

}

class BeforeLogin extends StepBody {
  run(context) {
    logger.debug('Running Before Login', context);
  }
}

class LoginWorkflow {
  constructor() {
    this.id = 'LoginWorkflow';
    this.version = 1;
  }

  build(builder) {
    builder
      .startWith(BeforeLogin)
      .thenRun((context) => {
        logger.debug('LoginWorkflow', context);
        return workflow_es.ExecutionResult.next();
      });
  }
}

export default LoginWorkflow;

