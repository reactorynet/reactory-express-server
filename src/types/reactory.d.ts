import { ObjectId } from "mongodb";


declare namespace Reactory {
  
  export enum UIFrameWork {
    material = 'material',
    bootstrap = 'bootstrap',
    office = 'office',
    blueprint = 'blueprint'
  }

  export interface IMongoDocument {
    _id: ObjectId
    id: string
  }  

  export interface IAuthentication {
    provider: string
    props: any
    lastLogin: Date
  }

  export interface ITemplateParam {
    name: string
    type: string
  }

  export interface ITemplate extends IMongoDocument {
    enabled: boolean
    organization?: ObjectId
    client: ObjectId
    view: string
    kind: string
    format: string
    content: string
    description?: string
    name?: string
    locale?: string
    elements: Array<ITemplate>
    parameters: Array<ITemplateParam>
  }

  export interface IPartner extends IMongoDocument {
    key: string
    name: string
  }

  export interface IOrganization extends IMongoDocument {
    id: string
    name: string
    code: string
    logo: string
    businessUnits: Array<IBusinessUnit>
  }

  export interface IBusinessUnit {
    id: string
    name: string    
  }

  export interface IMemberShip {
    id: string
    clientId: string | any
    organizationId: string | any
    businessUnitId: string | any
    enabled: boolean
    authProvider: string
    providerId: string
    lastLogin: Date
    roles: [String]
  }

  export interface IUser {
    id: string | any,
    email: string
    firstName: string
    lastName: string
    fullName(email: boolean): string
    authentications: any[]
    addRole(clientId: string, role: string, organizationId: string, businessUnitId: string): boolean
    removeRole(clientId: string, role: string, organizationId: string): IMemberShip[],
    removeAuthentication(provider: string): boolean
    getAuthentication(provider: string): IAuthentication
  }




  export interface ISchema {
    type: string,
    title?: string | undefined,
    description?: string | undefined,
    default?: any | undefined
  }
  
  export interface IObjectSchema extends ISchema {  
    properties?: Object, 
  }
  
  export interface IArraySchema extends ISchema {  
    items: IObjectSchema | IArraySchema
  }

  export interface IReactoryFormQuery {
    name: String,
    text: String,
    resultMap?: Object,
    queryMessage?: String,
    variables: Object,
    edit?: boolean,
    new?: boolean,
    delete?: boolean
  }

  export interface IReactoryFormMutation {
    name: String,
    text: String,
    objectMap: boolean,
    updateMessage?: String,
    variables?: Object,
    onSuccessMethod?: String,
    onSuccessUrl?: String,
    onSuccessRedirectTimeout?: number,
    options?: any,
  }

  export interface IReactoryFormMutations {
    new?: IReactoryFormMutation,
    edit?: IReactoryFormMutation,
    delete?: IReactoryFormMutation
  }

  export interface IFormGraphDefinition {    
    query?: IReactoryFormQuery,
    mutation?: IReactoryFormMutations,
  }
  
  export interface IWidgetMap {
    componentFqn: String,
    widget: String
  }

  export interface IReactoryForm {
    id: String,
    uiFramework: String,
    uiSupport: String[],
    uiResources?: any[],    
    title: String,
    tags?: String[],
    helpTopics?: String[]
    schema: ISchema | IObjectSchema | IArraySchema,
    uiSchema?: any,
    registerAsComponent: boolean,
    nameSpace: String,
    name: String,
    description?: String,
    version: String,
    roles?: String[],
    components?: String[],
    graphql?: IFormGraphDefinition,
    defaultFormValue?: any,
    refresh?: any,
    widgetMap?: IWidgetMap[],
    backButton?: Boolean,
    workflow?: Object,  
  }

  export interface IGraphShape {
    Query: Object,
    Mutation: Object,
  }

  export interface IGraphDefinitions {
    Resolvers: IGraphShape
    Types: string[]
  }

  export interface IWorkflow {
    id: string
    nameSpace: string
    name: string
    version: string
    component: any
    category: string,
    autoStart?: boolean
    props?: any
  }

  export interface IReactoryModule {
    nameSpace: string
    name: string
    version: string
    dependencies?: string[]
    priority: number,
    graphDefinitions?: IGraphDefinitions,
    workflows?: IWorkflow[],
    forms?: IReactoryForm[],
    services?: IReactoryServiceDefinition[], 
  }

  export interface IReactoryServiceResult<T> {
    data?: T,
    errors?: Error[],    
  }
  
  export interface IReactoryResultService<T> {
    (props: any, context: any):  IReactoryServiceResult<T>;
  }
  
  export interface IReactoryServiceDefinition {
    id: string
    name: string
    description: string
    isAsync?: boolean
    service: Function,
    serviceType?: string
    dependencies?: string[]    
  }


}
