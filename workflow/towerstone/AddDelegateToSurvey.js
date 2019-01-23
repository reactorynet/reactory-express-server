import { StepBody, ExecutionResult } from 'workflow-es';
import logger from '../../logging';

class AfterLogin extends StepBody {
  run(context) {
    console.log('After Loging', { context, date: new Date().valueOf() });
    return ExecutionResult.next();
  }
}

class BeforeLogin extends StepBody {
  run(context) {
    console.log('Running Before Login', { context, date: new Date().valueOf() });
    return ExecutionResult.next();
  }
}

class LoginWorkflow {
  constructor() {
    this.id = 'LoginWorkflow';
    this.version = 1;
  }

  build(builder) {
    console.log('building', builder);
    builder
      .startWith(BeforeLogin)
      .then(AfterLogin);
  }
}

export default LoginWorkflow;

