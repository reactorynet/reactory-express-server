
import { Reactory } from '@reactory/server-core/types/reactory';
import { resolver, query, property } from "@reactory/server-core/models/graphql/decorators/resolver";

@resolver
class ReactoryFormResolver {


  @query("ReactoryForms")
  async listForms(obj: any, args: any, context: Reactory.IReactoryContext): Promise<Reactory.IReactoryForm[]> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.list();
  }

  @query("ReactoryFormGlobals")
  async listGlobals(obj: any, args: any, context: Reactory.IReactoryContext): Promise<Reactory.IReactoryForm[]> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.globals();
  }

  @query("ReactoryFormGetById")
  async getFormById(obj: any, args: {id: string}, context: Reactory.IReactoryContext): Promise<Reactory.IReactoryForm> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.get(args.id);
  }

  @property("ReactoryForm", "uiResources")
  async getResources(form: Reactory.IReactoryForm, args: any, context: Reactory.IReactoryContext): Promise<any[]> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.getResources(form);
  }

}

export default ReactoryFormResolver;