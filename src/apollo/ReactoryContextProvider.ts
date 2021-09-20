import uuid from 'uuid';
import { Reactory } from "@reactory/server-core/types/reactory"; // eslint-disable-line
import { getService } from '@reactory/server-core/services';  // eslint-disable-line
import logger from '@reactory/server-core/logging';
import colors from 'colors/safe';

export default async ($session: any, currentContext: any): Promise<Reactory.IReactoryContext> => {

  const $id = uuid();
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
      case "d":
      case "debug":
      default: {
        logger.debug(colors.blue($message), meta);
      }
    }
  };


  /**
   * The Reactory Context Provider is the base provider and
   * can be considerd as the component and user container for the
   * duration of the exection.
   */
  let newContext: Reactory.IReactoryContext = {
    ...currentContext,
    user: $session.req.user,
    partner: $session.req.partner,
    $request: $session.req,
    $response: $session.res,
    log: $log,
    hasRole: (role: string, partner?: Reactory.IPartner, organization?: Reactory.IOrganizationDocument, businessUnit?: Reactory.IBusinessUnitDocument) => {
      return $session.req.user.hasRole(partner && partner._id ? partner._id : $session.req.partner._id,
        role,
        organization && organization._id ? organization._id : undefined,
        businessUnit && businessUnit._id ? businessUnit._id : undefined)
    },
    colors,
  };


  
  if ($session.req.user) {
    email = $session.req.user.email;
  }

  const $getService = (id: string, props: any = undefined) => {
    return getService(id, props, {
      ...newContext,
      getService: $getService,
    });
  };



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
      newContext.log = $log;
      newContext.colors = colors;
    }
  }

  return {
    id: $id,
    ...newContext,
    getService: $getService,
    log: $log,
    colors
  };
};
