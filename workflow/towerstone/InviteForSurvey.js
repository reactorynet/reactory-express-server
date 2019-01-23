import { StepBody, ExecutionResult } from 'workflow-es';
import { Survey, User } from '../../models/';
import logger from '../../logging';

class AttachUsersToSurvey extends StepBody {
  run(context) {
    console.log('Attach User to Survey', { context });
    return ExecutionResult.next();
  }
}

class CheckSurveyStatus extends StepBody {
  run(context) {
    console.log('Running Before Login', { context, date: new Date().valueOf() });
    return ExecutionResult.next();
  }
}

class InviteForSurvey {
  constructor() {
    this.id = 'towerstone.InviteForSurvey';
    this.version = 1;
  }

  build(builder) {
    console.log('building', builder);
    builder
      .startWith(CheckSurveyStatus)
      .then(AttachUsersToSurvey);
  }
}

export default InviteForSurvey;
