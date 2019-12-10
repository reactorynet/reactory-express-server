import { ObjectId } from "mongodb";
import Mongoose from "mongoose";
import ExcelJS from 'exceljs';
import { TemplateType, UIFrameWork } from "./constants";
import { Stream } from "stream";


declare namespace Reactory {

  export namespace Client {

    export interface IFrameProperties {
      url: string
      height: string
      width: string
      styles: any
      method?: string 
    }

    export interface IMessageHandler {
      id: string
      name: string
      type: string
      uri: string
      component: string
    }

    export interface IFramedWindowProperties {
      proxyRoot?: string
      frameProps?: IFrameProperties
      messageHandlers?: IMessageHandler[]
    }
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
  
  export interface ITemplate {
    enabled: boolean
    organization?: ObjectId
    client: ObjectId
    view: string
    kind: TemplateType
    format: string
    content: string
    description?: string
    name?: string
    locale?: string
    elements: Array<ITemplateDocument>
    parameters: Array<ITemplateParam>
  }

  export interface ITemplateDocument extends Mongoose.Document, ITemplate {}

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

  export interface IUserDocument extends Mongoose.Document, IUser {

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

  export interface IReactoryFormQueryErrorHandlerDefinition {
    componentRef: string,
    method: string
  }

  export interface IReactoryFormQuery {
    name: String,
    text: String,
    resultMap?: Object,
    queryMessage?: String,
    variables: Object,
    edit?: boolean,
    new?: boolean,
    delete?: boolean,
    options?: any,
    onError?: IReactoryFormQueryErrorHandlerDefinition
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

  export interface IReactoryPdfReport extends Client.IFramedWindowProperties {
    title?: string
  }

  
  export interface IExcelColumnDefinition {
    title: string
    propertyField: string
    format: string
    type: string
    required: boolean    
  }

  export interface IExcelSheet {
    name: string
    index: number
    arrayField: string
    startRow: number
    columns: IExcelColumnDefinition[]
  }

  export interface IExcelExportOptions {
    filename: string
    sheets: IExcelSheet[]
  }
  
  export interface IExport extends Client.IFramedWindowProperties {
    title?: string
    engine?: string
    useClient?: boolean
    mappingType?: string
    mapping?: any
    exportOptions?: any
  }

  export interface IUISchemaMenuItem {
    id: string,
    title: string,
    key: string,
    description: string,
    icon: string,
    uiSchema: any,
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
    uiSchemas?: IUISchemaMenuItem[],
    registerAsComponent: boolean,
    nameSpace: String,
    name: String,
    description?: String,
    version: String,
    roles?: String[],
    components?: String[],
    graphql?: IFormGraphDefinition,
    defaultFormValue?: any,
    defaultPdfReport?: IReactoryPdfReport, 
    defaultExport?: IExport,
    reports?: IReactoryPdfReport[],
    exports?:IExport[], 
    refresh?: any,
    widgetMap?: IWidgetMap[],
    backButton?: Boolean,
    workflow?: Object,  
    noHtml5Validate?: boolean,
    formContext?: any,
      /**
     * components to mount in the componentDef propertie
     */
    componentDefs?: String[]
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
  
  export namespace Service {
    
    export interface IExcelWriterService {
      writeAsFile(options: IExcelWriterOptions): Promise<Boolean>
      writeAsStream(options: IExcelWriterOptions): Promise<Boolean>
      writeToBuffer(options: IExcelWriterOptions): Promise<Buffer>
    }

    export interface IExcelReaderService {
      readFile(file: string): Promise<ExcelJS.Workbook>
    }

    export interface IExcelFormat {
      font: string
    }

    export interface IExcelWriterOptions {
      filename: string,
      query: string,
      params: any,
      output: string,
      formatting?: IExcelFormat,
      stream?: Stream
    }    
  }
}


