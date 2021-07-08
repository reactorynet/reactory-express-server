import uuid from 'uuid';
import { Reactory } from "@reactory/server-core/types/reactory"; // eslint-disable-line
import { getService } from '@reactory/server-core/services';  // eslint-disable-line
import logger from '@reactory/server-core/logging';

export default async ($session: any, currentContext: any): Promise<Reactory.IReactoryContext> => {
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
    hasRole: (role: string, partner?: Reactory.IPartner, organization?: Reactory.IOrganizationDocument, businessUnit?: Reactory.IBusinessUnitDocument) => {
      return $session.req.user.hasRole(partner && partner._id ? partner._id : $session.req.partner._id,
        role,
        organization && organization._id ? organization._id : undefined,
        businessUnit && businessUnit._id ? businessUnit._id : undefined)
    }
  };

  const $getService = (id: string, props: any = undefined) => {
    return getService(id, props, {
      ...newContext,
      getService: $getService,
    });
  };

  const $log = (message: string, meta: any = null, type: Reactory.LOG_TYPE = "debug",) => {
    //281e99d1-bc61-4a2e-b007-33a3befaff12
    const $message = `(${$id.substr(30, 6)}) ${email}: ${message}`;
    switch (type) {
      case "e":
      case "err":
      case "error": {
        logger.error($message, meta);

        break;
      }
      case "w":
      case "warn":
      case "warning": {
        logger.warn($message, meta);
        break;
      }
      case "d":
      case "debug":
      default: {
        logger.debug($message, meta);
      }
    }
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
    }
  }

  const $id = uuid();

  const { email } = $session.req.user;

  return {
    id: $id,
    ...newContext,
    getService: $getService,
    log: $log
  };
};
