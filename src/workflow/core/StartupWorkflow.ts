import { StepBody, ExecutionResult } from 'workflow-es';
import moment from 'moment';
import logger from '../../logging';


class BeforeStartup extends StepBody {
  when: any;
  
  run(context: any) {
    logger.debug(`Workflow Startup: Before Startup ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);
    return ExecutionResult.next();
  }
}


class AfterStartup extends StepBody {
  when: any;
  
  run(context: any) {
    logger.debug(`Workflow Startup: After Startup ${moment(this.when).format('YYYY-MM-DD HH:mm:ss')}`);
    return ExecutionResult.next();
  }
}


class StartupWorkflow {
  id: string;
  version: number;
  
  constructor() {
    this.id = 'reactory.StartupWorkflow@1.0.0';
    this.version = 1;
  }

  build(builder: any) {    
    builder
      .startWith(BeforeStartup).input((step: any, data: any) => {
        step.when = data.when;
      })
      .then(AfterStartup).input((step: any, data: any) => {
        step.when = data.when;
      });
  }
}

export default StartupWorkflow;

