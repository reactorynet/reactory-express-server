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
      `WF: Cleaning Cache ${moment(this.when).format("YYYY-MM-DD HH:mm:ss")}`
    );
    return ExecutionResult.next();
  }
}

class AfterCacheClean extends StepBody {
  run(context: any) {
    return ExecutionResult.next();
  }
}

class CleanCacheWorkflow implements Reactory.Workflow.IWorkflow {
  id: string = "core.CleanCacheWorkflow@1.0.0";
  nameSpace: string = "core";
  name: string = "CleanCacheWorkflow";
  component: CleanCacheWorkflow = this;
  category: string = "cache";
  autoStart?: boolean = true;
  props?: unknown = {
    interval: 1000 * 30,
    enabled: true,
  };
  version: string = "1.0.0";

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
        Cache.clean();
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
  nameSpace: "core",
  name: "CleanCacheWorkflow",
  version: "1.0.0",
  component: CleanCacheWorkflow,
  category: "workflow",
  autoStart: true,
  props: {
    interval: 1000 * 30,
    enabled: true,
  },
  id: "core.CleanCacheWorkflow@1.0.0",
} as Reactory.Workflow.IWorkflow;

export default CleanCacheWorkflow;
