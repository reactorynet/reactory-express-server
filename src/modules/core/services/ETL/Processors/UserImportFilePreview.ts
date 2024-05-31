'use strict';
import Reactory from '@reactory/reactory-core';



class UserImportFilePreview implements Reactory.Service.IProcessor {

  context: Reactory.Server.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  props: any;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  /**
   * The main execution function is process
   * @param params - paramters can include row offset
   */
  async process(params: any, next?: Reactory.Service.IProcessor): Promise<any> {

    this.context.user.hasAnyRole(this.context.partner._id);

    const { offset = 0, file, import_package, process_index } = params;

    return 'done';
  }

  static reactory = {
    id: 'core.UserFileImportPreview@1.0.0',
    name: 'UserFileImportPreview',
    nameSpace: 'core',
    version: '1.0.0',
    description: 'Reactory Service for valdating an import file for users',
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }
    ],
    serviceType: 'data',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new UserImportFilePreview(props, context);
    }
  }
}


export default UserImportFilePreview;
