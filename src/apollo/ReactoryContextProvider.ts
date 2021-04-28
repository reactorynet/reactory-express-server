import uuid from 'uuid';
import { Reactory } from "@reactory/server-core/types/reactory"; // eslint-disable-line
import { getService } from '@reactory/server-core/services';  // eslint-disable-line

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
  };

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
    }
  }

  return {
    id: uuid(),
    ...newContext,
    getService: $getService,
  };
};
