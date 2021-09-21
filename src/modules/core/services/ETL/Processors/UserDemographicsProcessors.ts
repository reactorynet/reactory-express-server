'use strict';
import { Reactory } from '@reactory/server-core/types/reactory';
import { MutationResult, IUserImportStruct } from './types';

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


    output.forEach(async (import_struct: IUserImportStruct, index: number) => {
      try {

        that.context.log(colors.debug(`Preparing Mutation #${index} for user ${import_struct.user.email}`), {}, 'debug', 'UserGeneralProcessor');
        if (preview === false && import_struct.user.email.indexOf('ERR') < 0) {
          const variables: any = { input: import_struct.user, organizationId: import_package.organization._id };
          delete variables.input.id;
          import_struct.onboarding_result = await this.mutate(create_user_mutation, variables).then();

          if (import_struct.onboarding_result.errors && import_struct.onboarding_result.errors.length > 0) {

            that.context.log(colors.warn(`Mutation #${index} for user ${import_struct.user.email} contains errors`), { errors: import_struct.onboarding_result.errors }, 'warning');

            import_struct.user.id = 'ERROR'
          } else {
            if (import_struct.onboarding_result.data.createUser && import_struct.onboarding_result.data.createUser.id) {
              import_struct.user.id = import_struct.onboarding_result.data.createUser.id;
            } else {

              import_struct.errors.push(`Error while creating / updating the user ${import_struct.user.email}`);
            }
          }
        } else {
          import_struct.user.id = 'PREVIEW_ID'
        }
      } catch (mutationError) {
        that.context.log(colors.error(`Error processing import ${mutationError.message}`), { error: mutationError }, 'error', 'UserGeneralProcessor')
        import_struct.errors.push(`Error while creating / updating the user ${import_struct.user.email} ${mutationError.message}`);
      }
    });
    
    
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