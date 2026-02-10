import { StepBody, ExecutionResult, WorkflowBase } from "workflow-es";
import moment from "moment";
import Cache from "@reactory/server-modules/reactory-core/models/CoreCache";
import logger from "@reactory/server-core/logging";

class BeforeCacheClean extends StepBody {
  run(context: any) {
    return ExecutionResult.next();
  }
}

class CleanCache extends StepBody {
  run(context: any) {
    Cache.clean();
    logger.debug(
      `WF: Cleaning Cache ${moment().format("YYYY-MM-DD HH:mm:ss")}`
    );
    return ExecutionResult.next();
  }
}

class AfterCacheClean extends StepBody {
  run(context: any) {
    return ExecutionResult.next();
  }
}

class CleanCacheWorkflow implements WorkflowBase<{interval: number, enabled: boolean}> {
  id: string = "core.CleanCacheWorkflow@1.0.0"
  version: number = 1;

  build(builder: any) {
    builder
      .startWith(BeforeCacheClean)
      .input(
        (step: { when: any; props: any }, data: { when: any; props: any }) => {
          step.when = data.when;
          step.props = data.props;
        }
      )
      .then(CleanCache)
      .input((step: { when: number; props: any }, data: { props: any }) => {
        step.when = moment().valueOf();       
        step.props = data.props;
      })
      .then(AfterCacheClean)
      .input((step: { when: number; props: any }, data: { props: any }) => {
        step.when = moment().valueOf();
        step.props = data.props;
      });
  }

  static meta = {};
}

CleanCacheWorkflow.meta = {
  id: "core.CleanCacheWorkflow@1.0.0",
  nameSpace: "core",
  name: "CleanCacheWorkflow",
  version: "1.0.0",
  component: CleanCacheWorkflow,
  category: "workflow",
  autoStart: false,
  props: {
    interval: 1000 * 30,
    enabled: true,
  },
} as Reactory.Workflow.IWorkflow;

export default CleanCacheWorkflow;
