
import Reactory from '@reactory/reactory-core';
import { resolver, query, property } from "@reactory/server-core/models/graphql/decorators/resolver";
import ApiError from 'exceptions';

@resolver
class ReactoryFormResolver {

  resolver: Reactory.IResolverStruct

  @query("ReactoryForms")
  async listForms(obj: any, args: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.Forms.IReactoryForm[]> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.list();
  }

  @query("ReactoryFormGlobals")
  async listGlobals(obj: any, args: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.Forms.IReactoryForm[]> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.globals();
  }

  @query("ReactoryFormGetById")
  async getFormById(obj: any, args: {id: string}, context: Reactory.Server.IReactoryContext): Promise<Reactory.Forms.IReactoryForm> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.get(args.id);
  }

  @property("ReactoryForm", "uiResources")
  async getResources(form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext): Promise<any[]> {
    const formSvc: Reactory.Service.IReactoryFormService = context.getService("core.ReactoryFormService@1.0.0") as Reactory.Service.IReactoryFormService;
    return formSvc.getResources(form);
  }

  @property("ReactoryForm", "schema")
  async getFormSchema(form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.ISchema> {

    if(!form) throw new ApiError("form object is null and should have a value", { where: "ReactoryForm.schema resolver" })

    if(form.schema && typeof form.schema === "object" ) {
      return form.schema as Reactory.Schema.AnySchema
    }

    if(form.schema && typeof form.schema === "function") {
      //we assume it is a resolver signature as it is 
      //running server side.
      return (form.schema as Reactory.Schema.TServerSchemaResolver)(form, args, context, info);
    }

    throw new ApiError("No valid form.schema property");

  }

  @property("ReactoryForm", "uiSchema")
  async getFormUISchema(form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.IFormUISchema> {
    if(!form) throw new ApiError("form object is null and should have a value", { where: "ReactoryForm.uiSchema resolver" })

    if(form.uiSchema && typeof form.uiSchema === "object") {
      return form.uiSchema as Reactory.Schema.IFormUISchema
    }

    if(form.uiSchema && typeof form.uiSchema === "function") {
      return (form.uiSchema as Reactory.Schema.TServerUISchemaResolver)(form, args, context, info);
    }
  }

}

export default ReactoryFormResolver;