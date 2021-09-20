'use strict';
import { Reactory } from '@reactory/server-core/types/reactory';


class UserDemographicsProcessor implements Reactory.IProcessor {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  fileService: Reactory.Service.IReactoryFileService;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
    this.fileService = props.$dependencies.fileService
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  /**
   * 
   * @param params - paramters can include row offset
   */
  async process(params: any, nextProcessor?: Reactory.IProcessor): Promise<any> {

    const { offset = 0, file, import_package, process_index = 0, next, input = [], preview = false, processors = [] } = params;

    let output: any[] = [...input];

    
    
    let $next: Reactory.IProcessor = null;

    if (nextProcessor && nextProcessor.process) {
      $next = nextProcessor;
    }

    if ($next === null && next && next.serviceFqn) {
      $next = this.context.getService(next.serviceFqn);
    }

    if ($next === null && processors.length > process_index + 1) {
      $next = this.context.getService(processors[process_index + 1].serviceFqn);
    }

    debugger;

    if ($next !== null && $next.process) {
      output = await $next.process({ input: output, file, import_package, process_index: process_index + 1 }).then();
    }

    return output;

  }


  static dependencies: ['core.ReactoryFileService@1.0.0'];
  static reactory = {
    id: 'core.UserFileImportProcessDemographics@1.0.0',
    name: 'Reactory User File Import Demographics',
    description: 'Reactory Service for importing demographics.',
    dependencies: [{ id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserDemographicsProcessor(props, context);
    }
  };
}

export default UserDemographicsProcessor;