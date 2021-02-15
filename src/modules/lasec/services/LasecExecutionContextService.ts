/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import { getLoggedIn360User } from '../resolvers/Helpers';
import { Lasec360User, ILasecContextProvider } from '../types/lasec';

class LasecExecutionContextProvider implements ILasecContextProvider { // eslint-disable-line


  name: string = 'LasecExecutionContextProvider';
  nameSpace: string = 'lasec-crm';
  version: string = '1.0.0';

  context: Reactory.IReactoryContext;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    logger.debug('New Instance of LasecExecutionContextProvider');
    this.context = context;
  }

  getExecutionContext(): Reactory.ReactoryExecutionContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.ReactoryExecutionContext): boolean {
    this.context = executionContext;
    return true;
  }

  async getContext(currentContext: Reactory.IReactoryContext): Promise<Reactory.IReactoryContext> {
    try {
      const LasecUser: Lasec360User = await getLoggedIn360User(false, this.context).then();

      return {
        lasecUser: LasecUser,
        ...currentContext,
      };
    } catch (contextError) {
      logger.error('Could not get logged in user for Lasec CRM', contextError);
      return currentContext;
    }
  }
}

const serviceDef: Reactory.IReactoryServiceDefinition = {
  id: 'lasec-crm.LasecExecutionContextProvider@1.0.0',
  name: 'Lasec Execution Context Provider / Extender',
  description: 'Service class for all logging handling services.',
  dependencies: [],
  serviceType: 'ILasecContextProvider',
  service: (props: Reactory.IReactoryServiceProps, context: any) => {
    return new LasecExecutionContextProvider(props, context);
  },
};

export default serviceDef;
