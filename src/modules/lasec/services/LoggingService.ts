

import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import LasecDatabase from '../database/index';
import { ILasecLoggingService } from '../types/lasec';

class LasecLoggingService implements ILasecLoggingService {

  name: string;
  nameSpace: string;
  version: string;
  context: Reactory.IReactoryContext;
  initialized: boolean;



  constructor(props: any, context: Reactory.IReactoryContext) {

    this.context = context;

    this.name = 'LasecErrorService';
    this.nameSpace = 'lasec-crm';
    this.version = '1.0.0';
    this.initialized = false;

    LasecDatabase.Install.LasecLog(context).then((installed) => {
      this.initialized = installed;
    });

  }

  getExecutionContext(): Reactory.ReactoryExecutionContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.ReactoryExecutionContext): boolean {
    this.context = executionContext;
    return true;
  }

  writeLog(message: string, source: string = 'not-set', severity: number = 0, data: any = {}) {

    let $message = message || '';
    let $data = data;
    if ($message.length > 8000) {
      $message = message.substr(0, 7999);
      $data = {
        autowrapped: true,
        message,
        data: $data,
      };
    }

    LasecDatabase.Create.WriteLog({
      timestamp: new Date().valueOf(),
      username: this.context.user.fullName(true),
      message: $message,
      data: $data,
      severity,
      source,
    }, this.getExecutionContext());
  }
}

const serviceDef: Reactory.IReactoryServiceDefinition = {
  id: 'lasec-crm.LasecLoggingService@1.0.0',
  name: 'Lasec Logging Service 🚨',
  description: 'Service class for all logging handling services.',
  dependencies: [],
  serviceType: 'Lasec.Logging',
  service: (props: Reactory.IReactoryServiceProps, context: any) => {
    return new LasecLoggingService(props, context);
  },
};

export default serviceDef;