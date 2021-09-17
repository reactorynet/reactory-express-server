'use strict';
import { Reactory } from '@reactory/server-core/types/reactory';



class UserImportFilePreview implements Reactory.IProcessor {

  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any, next?: Reactory.IProcessor): Promise<any> {

    this.context.user.hasAnyRole(this.context.partner._id);

    const { offset = 0, file, import_package, process_index } = params;

    return 'done';
  }

  static reactory = {
    id: 'core.UserFileImportValidation@1.0.0',
    name: 'Reactory User File Import Validation',
    description: 'Reactory Service for valdating an import file for users',
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }
    ],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new UserImportFilePreview(props, context);
    }
  }
}


export default UserImportFilePreview;
