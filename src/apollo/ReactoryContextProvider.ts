import { v4 as uuid } from 'uuid';
import { Reactory } from "@reactory/server-core/types/reactory"; // eslint-disable-line
import { getService } from '@reactory/server-core/services';  // eslint-disable-line
import logger from '@reactory/server-core/logging';
import Hash from '@reactory/server-core/utils/hash';
import colors from 'colors/safe';
import { ReactoryContainer } from '@reactory/server-core/ioc';
import modules from '@reactory/server-core/modules';

/***
 * The Reactory Context Provider creates a context for the execution thread which is passed through with each request
 * 
 * NOTE: Changes to this file only kicks in after restarting the server from cold, meaning you have to kill 
 * the process with Ctrl+C and then restart the service with bin/start.sh
 */
export default async ($session: any, currentContext: any = {}): Promise<Reactory.Server.IReactoryContext> => {
  const $id = uuid();
  let $context = currentContext || {};
  
  const context_state = {};

  let email = 'anon@local';

  colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
  });

  const $log = (message: string, meta: any = null, type: Reactory.LOG_TYPE = "debug", clazz: string = 'any_clazz') => {
    //281e99d1-bc61-4a2e-b007-33a3befaff12    

    const $message = `${clazz}(${$id.substr(30, 6)}) ${email}: ${message}`;
    switch (type) {
      case "e":
      case "err":
      case "error": {
        logger.error(colors.red($message), meta);

        break;
      }
      case "w":
      case "warn":
      case "warning": {
        logger.warn(colors.yellow($message), meta);
        break;
      }
      case "i":
      case "info": {
        logger.warn(colors.gray($message), meta);
        break;
      }
      case "d":
      case "debug":
      default: {
        logger.debug(colors.blue($message), meta);        
      }
    }
  };

  const $debug = (message: string, meta: any = null, clazz: string = 'any_clazz') => {
    $log(message, meta, "debug", clazz);
  }

  const $warn = (message: string, meta: any = null, clazz: string = 'any_clazz') => {
    $log(message, meta, "warn", clazz);
  }

  const $error = (message: string, meta: any = null, clazz: string = 'any_clazz') => {
    $log(message, meta, "error", clazz);
  }
  
  const $info = (message: string, meta: any = null, clazz: string = 'any_clazz') => {
    $log(message, meta, "info", clazz);
  }

  let $user = $context.user ? $context.user : null;
  let $partner = $context.partner ? $context.partner : null;
  let $request = null;
  let $response = null;

  //if the context is being used in the context of a session
  if($session !== null && $session !== undefined) {
    $user = $session.req.user;
    $partner = $session.req.partner;
    $request = $session.req;
    $response = $session.res;

    email = $user.email;

  }
 
  /**
   * The Reactory Context Provider is the base provider and
   * can be considerd as the component and user container for the
   * duration of the exection.
   */
  let newContext: Reactory.Server.IReactoryContext = {
    ...$context,
    id: $id,
    user: $user,
    partner: $partner,
    $request,
    $response,
    modules: modules.enabled,
    container: ReactoryContainer,
    log: $log,
    info: $info,
    warn: $warn,
    debug: $debug,
    error: $error,
    hasRole: (role: string, partner?: Reactory.IReactoryClient, organization?: Reactory.IOrganizationDocument, businessUnit?: Reactory.IBusinessUnitDocument) => {

      if($session.req.user === null || $session.req.user === undefined) {
        $log(`User is anon`, {}, 'debug', 'ReactoryContextProvider')
        return false;
      }

      if ($session.req.user && $session.req.user.hasRole) {
        return $session.req.user.hasRole(partner && partner._id ? partner._id : $session.req.partner._id,
          role,
          organization && organization._id ? organization._id : undefined,
          businessUnit && businessUnit._id ? businessUnit._id : undefined)
      } else {
        $log(`User is anon`, {}, 'debug', 'ReactoryContextProvider')
        return false;
      }      
    },
    utils: {
      hash: Hash
    },    
    colors,
    state: context_state,
  };


  
  
  const $getService = (id: string, props: any = undefined, $context?: Reactory.Server.IReactoryContext, lifeCycle?: Reactory.SERVICE_LIFECYCLE ) => {
    $log(`Getting service ${id} [${lifeCycle || "instance"}]`)
    if($context && Object.keys($context).length > 0) {
      newContext = { 
        ...newContext, 
        ...$context 
      }
    }


    return getService(id, props, {
      ...newContext,
      getService: $getService,
    }, lifeCycle);
        
  };

  newContext.getService = $getService;


  /**
   * We check in the configuration settings if there is a "execution_context_service" key.
   * if the key is found and if it is a string with an @ in the indicator then we can assume
   * this is specific provider for the partner which will extend / overwrite elements of the
   * context provider.
   */
  const executionContextServiceName = newContext.partner.getSetting('execution_context_service');
  if (executionContextServiceName && executionContextServiceName.data && `${executionContextServiceName.data}`.indexOf('@') > 0) {
    const partnerContextService: Reactory.IExecutionContextProvider = $getService(executionContextServiceName.data);
    if (partnerContextService && partnerContextService.getContext) {
      newContext = await partnerContextService.getContext(newContext).then();
    }
  }

  
  return newContext;
};
