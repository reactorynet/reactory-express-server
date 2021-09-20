import { ObjectID, ObjectId } from "mongodb";
import Mongoose from "mongoose";
import fs from 'fs';
import ExcelJS from 'exceljs';
import { TemplateType, UIFrameWork } from "./constants";
import { Stream } from "stream";
import { Application } from "express";
declare namespace Reactory {

  export interface IStartupOptions {
    [key: string]: any
  }
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
      messageHandlers?: IMessageHandler[],
      method?: string,
      delivery?: string,
    }

    export interface IReactoryPluginDefinition {
      nameSpace: String,
      name: String,
      version: String,
      roles?: String[],
      root?: String,
      disabled?: Boolean,
      verified?: Boolean,
      certificate?: String,
      license?: String
    }
  }

  export interface IReactoryClient {
    key: string,
    name: string,
    username: string,
    email: string,
    salt: string,
    siteUrl: string,
    emailSendVia: string,
    emailApiKey: string,
    resetEmailRoute: string,
    password: string,
    avatar: string, // application avatar
    theme: string, // theme title
    mode: string,
    themeOptions: any,
    applicationRoles: string[],
    billingType: string,
    modules?: any[],
    menus: any[],
    routes: any[],
    auth_config?: any[],
    settings?: any[],
    whitelist?: string[]
    components?: any[],
    users?: any[],
    allowCustomTheme?: boolean,
    createdAt?: Date,
    updatedAt?: Date,
    colorScheme: () => any
    getSetting: (key: string) => any;
    getDefaultUserRoles: () => string[];
    setPassword: (password: string) => void;
  }

  export interface IReactoryClientDocument extends Mongoose.Document, IReactoryClient { }

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

  export interface IRecordMeta {
    source: any,
    owner: string
    reference: string,
    lastSync: Date,
    nextSync: Date,
    mustSync: boolean,
  }

  export interface ITemplate {
    enabled: boolean
    organization?: ObjectId
    client: any
    businessUnit?: ObjectId
    user?: ObjectId
    visiblity?: string | "user" | "public" | "businessUnit" | "organization" | "client"
    view: string
    kind: TemplateType
    format: string
    content: string
    description?: string
    name?: string
    locale?: string
    elements: Array<ITemplate>
    parameters: Array<ITemplateParam>
    contentFromFile(): string,
    createdBy?: ObjectId,
    created?: Date
    updated?: Date
    updatedBy?: ObjectId
    [key: string]: any
  }

  export interface IEmailTemplate {
    id: string,
    view: string

    name?: string
    description?: string

    organization?: ObjectId
    client: ObjectId
    businessUnit?: ObjectId
    userId?: ObjectId
    visiblity?: string | "user" | "public" | "businessUnit" | "organization" | "client"

    subject: string
    body: string
    signature?: string

  }

  export interface ToEmail {
    display: string,
    email: string
  }

  export interface EmailAttachment {
    id: ObjectID
    link: string,
    filename: string,
    original: string,
    path?: string,
    size: number,
    sizeString: string,
    mimetype: string,
    contentBytes: any,
    [key: string]: any
  }

  export interface EmailSentResult {
    success: boolean,
    message: string
  }

  export interface IEmailMessage {
    id?: string | ObjectID
    userId: string,
    via: string | 'reactory' | 'microsoft' | 'google';
    subject: string,
    contentType: string,
    body: string,
    to: ToEmail[],
    cc?: ToEmail[],
    bcc?: ToEmail[],
    attachments?: EmailAttachment[],
    saveToSentItems: boolean,
    context?: string,
    [key: string]: any
  }


  export interface ITemplateDocument extends Mongoose.Document, ITemplate { }

  export interface IPartner extends IMongoDocument {
    key: string
    name: string
    getSetting: (key: String) => any
    [key: string]: any
  }

  export interface IOrganizationSetting {
    name: string,
    componentFqn: string,
    data: any
  }

  export interface IOrganizationDocument extends Mongoose.Document, IOrganization { }

  export interface IBusinessUnit {
    [key: string]: any,
    id?: any,
    name: string
    description?: string,
    avatar?: string,
    members: Reactory.IUser[] | Reactory.IUserDocument[],
    createdAt: Date,
    updatedAt: Date,
    owner?: Reactory.IUser | Reactory.IUserDocument
  }

  export interface IBusinessUnitDocument extends Mongoose.Document, IBusinessUnit { }

  export interface IOrganization {
    [key: string]: any
    name: string
    code: string
    logo: string
    businessUnits: IBusinessUnit[] | IBusinessUnitDocument[] | any[],
    settings: IOrganizationSetting[] | any[]
    getSetting(name: string): IOrganizationSetting
    setSetting(name: string, data: any, componentFqn: string): IOrganizationSetting
  }


  export interface IMembership {
    id?: any
    client?: IPartner
    clientId: string | any
    organization?: IOrganigramDocument,
    organizationId: string | any
    businessUnit?: IBusinessUnitDocument,
    businessUnitId: string | any
    enabled: boolean
    authProvider: string
    providerId: string
    lastLogin: Date,
    user?: IUserDocument
    roles: string[]
  }

  export interface IMembershipDocument extends Mongoose.Types.Subdocument, IMembership { }

  export interface ISessionInfo {
    id: ObjectId | string
    host: string
    client: string
    jwtPayload: {
      iss: string
      sub: string
      exp: Date
      aud: string[]
      iat: Date
      userId: ObjectId | string
      organizationId: ObjectId | string
      refresh: string
      roles: string[]
    }
  }

  export interface INotification {
    id: ObjectId,
    user: IUserDocument,
    title: String,
    text: String,
    link: String,
    createdAt: Date,
    read: Boolean,
    details: {},
  }

  export interface IRegion {
    id?: any,
    title: String,
    description: String,
    icon: String,
    deleted: Boolean,
    organization?: IOrganization,
    locations?: [
      {
        title: String,
        country: String,
        province: String,
        district: String,
        city: String
      }
    ],
  }

  export interface IOperationalGroup {
    title: String,
  }

  export interface IRegionDocument extends Mongoose.Document, IRegion {
    new(): IRegionDocument;
    AddRegion(region: IRegion): void;
  }




  export interface ITeam {
    id?: any,
    name: String
    description: String
    avatar: String
    deleted: Boolean
  }

  export interface ITeamDocument extends Mongoose.Document, ITeam { }


  export interface IOperationalGroupDocument extends Mongoose.Document, IRegion { }

  export interface IReactoryLoginResponse {
    token: string,
    firstName: string,
    lastName: string,
  }

  export interface IUser {
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    salt: string,
    password: string,
    avatar: string,
    avatarProvider: string,
    organization: ObjectId | Reactory.IOrganizationDocument,
    memberships: Reactory.IMembership[] | Mongoose.Types.Array<Reactory.IMembership>,
    sessionInfo: Reactory.ISessionInfo,
    authentications: Reactory.IAuthentication[],
    deleted: boolean,
    createdAt: Date,
    updatedAt: Date,
    meta?: Reactory.IRecordMeta,
    fullName(email: boolean): string,
    setPassword(password: string): void,
    validatePassword(password: string): boolean,
    hasRole(clientId: string, role: string, organizationId?: string, businessUnitId?: string): boolean,
    hasAnyRole(clientId: string, organizationId?: string, businessUnitId?: string): boolean,
    addRole(clientId: string, role: string, organizationId?: string, businessUnitId?: string): boolean
    removeRole(clientId: string, role: string, organizationId: string): IMembership[],
    removeAuthentication(provider: string): Promise<boolean>
    getAuthentication(provider: string): IAuthentication
    [key: string]: any
  }

  export interface IUserDocument extends Mongoose.Document, IUser {

  }

  export interface IPeerEntry {
    user: ObjectId | Reactory.IUserDocument
    relationship: string
    isInternal: boolean
    inviteSent: boolean
    confirmed?: boolean
    confirmedAt?: Date
  }

  export interface IOrganigram {
    organization: ObjectId | Reactory.IOrganizationDocument
    user: ObjectId | Reactory.IUserDocument
    businessUnit: ObjectId | Reactory.IBusinessUnitDocument
    position: string
    allowEdit: Boolean
    peers: IPeerEntry[]
    createdAt: Date
    updatedAt: Date
    confirmedAt: Date
  }

  export interface IOrganigramDocument extends Mongoose.Document, IOrganigram { }

  /** ReactoryFile Management Models Interface */
  export interface IReactoryFilePermissions {
    id?: ObjectID,
    roles: string[]
    partnersIncluded?: ObjectID[],
    partnersExcluded?: ObjectID[],
    usersIndcluded?: ObjectID[],
    usersExcluded?: ObjectID[]
  }

  export interface IReactoryFileRemoteEntry {
    id: string
    url: string
    lastSync: Date
    success: boolean,
    verified?: boolean,
    syncMessage: string,
    priority?: number,
    modified?: Date
  }

  export interface ITimeline {
    timestamp: number,
    message: string
  }

  export interface IReactoryFile extends Mongoose.Document {
    id: ObjectID,
    hash: number,
    partner: ObjectID,
    ttl?: number,
    path: string,
    alias: string,
    filename: string,
    alt: string[],
    algo: string,
    link: string,
    mimetype: string,
    size: number,
    created?: Date,
    uploadContext?: string,
    uploadedBy: ObjectID,
    owner: ObjectID,
    public?: Boolean,
    published?: Boolean,
    permissions?: IReactoryFilePermissions[],
    tags?: string[],
    remotes?: IReactoryFileRemoteEntry[],
    timeline?: ITimeline[],
    status?: string,
    deleted?: boolean,
    readLines(start: number, lines: number): Promise<string[]>,
    stats(): fs.Stats,
    exists(): boolean,
    getServerFilename(): string
    [key: string]: any
  }

  export interface IReactoryFileStatic {
    new(): IReactoryFile
    getItem(link: string): Promise<IReactoryFile>
    setItem(link: string, file: IReactoryFile): void
    clean(): void
  }

  export interface IReactoryFileModel extends IReactoryFile, IReactoryFileStatic { }
  /** ReactoryFile Management Models Interface -- End */

  /**
   * @deprecated - Use IReactoryContext instead.
   */
  export interface ReactoryExecutionContext extends IReactoryContext { }

  export interface ISchemaObjectProperties {
    [key: string]: ISchema
  }

  export interface ISchema {
    type: string | "object" | "string" | "number" | "boolean" | "array" | "null",
    title?: string | undefined,
    description?: string | undefined,
    default?: any | undefined,
    required?: any | undefined,
    properties?: ISchemaObjectProperties | any | undefined,
    dependencies?: any | undefined,
    definitions?: any,
    items?: ISchema,
    format?: string | "email" | "password" | "date" | "date-time",
    enum?: string[]
  }

  export interface IStringSchema extends ISchema {
    type: string | "string",
    minLength?: number,
    maxLength?: number
  }

  export interface INumberSchema extends ISchema {
    type: "number",
    min?: number,
    max?: number
  }

  export interface IDateSchema extends ISchema {
    type: string | "string",
    format: "date",
    min?: number | string,
    max?: number | string
  }

  export interface IDateTimeSchema extends ISchema {
    type: "string",
    format: "date-time"
  }

  export interface IObjectSchema extends ISchema {
    type: "object",
    properties?: ISchemaObjectProperties,
  }

  export interface IArraySchema extends ISchema {
    type: "array",
    items: IObjectSchema | IDateTimeSchema | IDateSchema | INumberSchema | IStringSchema | ISchema
  }

  /**
   * The base UISchema definition
   */
  export interface IUISchema {
    'ui:widget'?: string | "null",
    'ui:options'?: object | "null",
    [key: string]: any,
  }

  export interface IObjectSchema extends ISchema {
    properties?: ISchemaObjectProperties,
  }

  // export interface IArraySchema extends ISchema {
  //   items: IObjectSchema | IArraySchema
  // }

  export interface IReactoryFormQueryErrorHandlerDefinition {
    componentRef: string,
    method: string
  }

  export interface IReactoryEvent {
    name: String,
    data?: any | undefined,
    dataMap?: any,
    //used when mapping a object to primitive
    valueKey?: string
  }

  export interface IReactoryFormQuery {
    name: String,
    text: String,
    resultMap?: Object,
    resultType?: string,
    queryMessage?: String,
    formData?: Object,
    variables?: Object,
    edit?: boolean,
    new?: boolean,
    delete?: boolean,
    options?: any,
    autoQuery?: boolean,
    //the number of milliseconds the autoQuery must be delayed for before executing
    autoQueryDelay?: number,
    waitUntil?: string,
    waitTimeout?: number,
    interval?: number,
    useWebsocket?: boolean,
    onError?: IReactoryFormQueryErrorHandlerDefinition,
    onSuccessMethod?: String | "redirect" | "notification" | "function",
    onSuccessEvent?: IReactoryEvent | undefined,
    notification?: any,
    refreshEvents?: IReactoryEvent[] | undefined
  }

  export interface IReactoryNotification extends NotificationOptions {
    inAppNotification?: boolean,
    title?: string,
    type?: string | "success" | "warning" | "danger" | "info",
    props?: any,
  }

  export interface IReactoryFormMutation {
    name: String,
    text: String,
    objectMap?: boolean,
    updateMessage?: String,
    resultMap?: Object,
    resultType?: string,
    variables?: Object,
    formData?: Object,
    onSuccessMethod?: String | "redirect" | "notification" | "function",
    onSuccessEvent?: IReactoryEvent | undefined,
    refreshEvents?: IReactoryEvent[] | undefined
    onSuccessUrl?: String,
    onSuccessRedirectTimeout?: number,
    onError?: IReactoryFormQueryErrorHandlerDefinition,
    options?: any,
    notification?: IReactoryNotification,
    throttle?: number,
    handledBy?: String | 'onChange' | 'onSubmit'
  }

  export interface IReactoryFormMutations {
    new?: IReactoryFormMutation,
    edit?: IReactoryFormMutation,
    delete?: IReactoryFormMutation,
    [key: string]: IReactoryFormMutation
  }

  export interface IReactoryFormQueries {
    [key: string]: IReactoryFormQuery,
  }

  export interface IFormGraphDefinition {
    query?: IReactoryFormQuery,
    mutation?: IReactoryFormMutations,
    queries?: IReactoryFormQueries,
    clientResolvers?: any
  }

  export interface IWidgetMap {
    componentFqn?: String,
    component?: String,
    widget: String
  }

  export interface IObjectMap {
    [key: string]: string | Array<any> | object
  }

  export interface IReactoryPdfReport extends Client.IFramedWindowProperties {
    title?: string,
    report: string,
    folder: string,
    icon?: string,
    reportTitle?: string,
    waitingText?: string,
    dataMap?: IObjectMap
  }


  export interface IExcelColumnDefinition {
    title: string
    propertyField: string
    format: string
    type: string
    width?: number,
    key?: string,
    required: boolean
    style?: any
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
    disabled?: string
  }

  export interface IUISchemaMenuItem {
    id: string,
    title: string,
    key: string,
    description: string,
    icon: string,
    uiSchema: any,
    //used to override the graphql definitions for that view type
    graphql?: IFormGraphDefinition,
    modes?: string
  }

  export interface IReactoryComponentDefinition {
    fqn?: string,
    dependencies?: IReactoryComponentDefinition[]
    props?: any,
    propsMap?: any,
    componentType: string | "component" | "object" | "function" | "module" | "plugin"
  }


  export interface IEventBubbleAction {
    eventName: string,
    action: string | "bubble" | "swallow" | "function",
    functionFqn?: string,
  }

  export interface IReactoryForm {
    /**
     * A unique id for the form. When the form is defined on the server side, the id has to be unique
     * across all forms!
     */
    id: String,
    /**
     * Indicates what UI framework the form is built / designed to use.
     * options will be "material" and later "bootstrap" / others.
     */
    uiFramework: String,
    /**
     * This indicates the ui framekworks that the form is intended to support.
     */
    uiSupport: String[],
    /**
     * List of scripts or styles sheets that get loaded async for the application to use.
     */
    uiResources?: any[],
    title: String,
    tags?: String[],
    display?: boolean,
    className?: String,
    style?: any,
    helpTopics?: String[]
    schema: ISchema | IObjectSchema | IArraySchema,
    sanitizeSchema?: ISchema | IObjectSchema | IArraySchema,
    uiSchema?: any,
    uiSchemas?: IUISchemaMenuItem[],
    defaultUiSchemaKey?: string,
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
    exports?: IExport[],
    refresh?: any,
    widgetMap?: IWidgetMap[],
    backButton?: Boolean,
    workflow?: Object,
    noHtml5Validate?: boolean,
    formContext?: any,
    eventBubbles?: IEventBubbleAction[]
    /**
   * components to mount in the componentDef propertie
   */
    componentDefs?: String[]
    queryStringMap?: any,
    dependencies?: IReactoryComponentDefinition[]
  }


  export type ReactoryResolverAsync = (parent: any, params: any, context: Reactory.IReactoryContext, info: any) => Promise<any>;
  export type ReactoryResolverSync = (parent: any, params: any, context: Reactory.IReactoryContext, info: any) => any;
  export type ReactoryResolverObject = {
    [key: string]: ReactoryResolverAsync | ReactoryResolverAsync
  }

  export interface IGraphShape {
    [key: string]: ReactoryResolverAsync | ReactoryResolverAsync | ReactoryResolverObject
    Query?: {
      [key: string]: (parent: any, params: any, context: Reactory.IReactoryContext, info: any) => Promise<any>
    },
    Mutation?: {
      [key: string]: (parent: any, params: any, context: Reactory.IReactoryContext, info: any) => Promise<any>
    },
    Subscription?: {
      [key: string]: (parent: any, params: any, context: Reactory.IReactoryContext, info: any) => Promise<any>
    }
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

  export interface IReactoryPdfGenerator {
    enabled: boolean
    key: String
    name: String
    description: String
    content: (params: any) => Promise<any>
    resolver: (params: any) => Promise<any>,
    props: {
      meta: {
        title: String
        author: String
        [key: string]: any,
      },
      fonts: {
        [key: string]: {
          normal: String,
          bold: String,
        }
      },
      defaultFont: String
      fontSize: number
    }
  }

  export interface IReactoryPdfComponent {
    nameSpace: string
    name: string
    version: string
    component: IReactoryPdfGenerator
  }

  export interface IReactoryModuleDefinition {
    id: string
    name: string
    key: string
    fqn: string
    license: string
    moduleEntry: string
    shop: string
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
    pdfs?: IReactoryPdfComponent[]
    services?: IReactoryServiceDefinition[],
    clientPlugins?: Client.IReactoryPluginDefinition
  }

  export interface IReactoryServiceResult<T> {
    data?: T,
    errors?: Error[],
  }

  export interface IReactoryResultService<T> {
    (props: any, context: any): IReactoryServiceResult<T>;
  }

  export interface IReactoryServiceProps {
    [key: string]: any,
    $services: Reactory.IReactoryServiceRegister,
  }

  export interface IReactoryServiceDefinition {
    id: string
    name: string
    description: string
    isAsync?: boolean
    service(props: IReactoryServiceProps, context: any): any,
    serviceType?: string
    dependencies?: string[] | any[]
  }

  export interface IReactoryServiceRegister {
    [key: string]: IReactoryServiceDefinition
  }

  export namespace Service {



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

    export interface IReactoryService {
      name: string
      nameSpace: string
      version: string
    }
    export interface IReactoryStartupAwareService extends IReactoryService {
      onStartup(): Promise<any>
    }

    export interface IReactoryShutdownAwareService extends IReactoryService {
      onShutdown(): Promise<any>
    }

    export interface IReactoryContextAwareService extends IReactoryService {

      getExecutionContext(): IReactoryContext
      setExecutionContext(executionContext: IReactoryContext): boolean


    }


    export interface IExcelWriterService extends IReactoryContextAwareService {
      writeAsFile(options: IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<Boolean>
      writeAsStream(options: IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<Boolean>
      writeToBuffer(options: IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<Buffer>
    }

    export interface ICoreEmailService extends IReactoryStartupAwareService, IReactoryContextAwareService {
      sendEmail(message: Reactory.IEmailMessage): Promise<Reactory.EmailSentResult>
    }

    export interface IErrorHandlerServer extends IReactoryContextAwareService {
      handle<T>(FunctionPointer: Promise<T>): T
    }

    export interface IReactoryDefaultService extends IReactoryStartupAwareService, IReactoryContextAwareService { }


    export interface ITemplateService extends IReactoryStartupAwareService, IReactoryContextAwareService {
      /**
       * Service function for rerturning a template objeect
       * @param view - string field that represents a unique element within the context of a view, reactory client id and organisation id
       * @param reactoryClientId - the reactory client id to use in the filter, default will be global.partner
       * @param organizationId - the organisation id to use in the filter, default is null, which means the template applies to organisation 
       * @param businessUnitId - the business unit id to use as part of the filter
       * @param userId - the user id to use as part of the filter
       */
      getTemplate(view: string, reactoryClientId: string, organizationId?: string, businessUnitId?: string, userId?: string): Promise<ITemplate>

      /***
       * Service function to set a template for a given view, reactory client and organisation id
       * @param view - the view name to use - if found it will update the exsting one
       * @param reactoryClientId - the client id to use in the filter, default is global.partner
       * @param organizationId - the organization id the template will be linked to 
       * @param businessUnitId - the business unit id the template will be linked to 
       * @param userId - the user the template will be linked to
       */
      setTemplate(view: string, template: ITemplate, reactoryClientId?: string | ObjectID, organizationId?: string | ObjectID, businessUnitId?: string | ObjectID, userId?: string | ObjectID): Promise<ITemplate>
    }

    export interface IEmailTemplateService extends ITemplateService {
      /**
       * Template Service function that converts a standard ITemplate into a IEmailTemplate by extracting the 
       * subject, body and footer (if available) for this template
       * @param template The template to use as the basis of an email template
       */
      hydrateEmail(template: ITemplate | ITemplateDocument): Promise<IEmailTemplate>

      /**
       * Template service function that converts the IEmailTemplate into an ITemplate
       * @param template The email template to convert to a standard ITemplate
       */
      dehydrateEmail(template: IEmailTemplate): Promise<ITemplate>
    }

    export interface ITemplateRenderingService extends IReactoryService {
      /**
       * 
       * @param template - can either be an object of type ITemplate or string.
       * @param properties - the property bag that is passed to the ejs engine to render the template
       */
      renderTemplate(template: ITemplate | string, properties: any): string
    }

    export interface IReactoryTemplateService extends Reactory.Service.ITemplateService, Reactory.Service.ITemplateRenderingService, Reactory.Service.IEmailTemplateService { }

    export interface IFile {
      createReadStream: Function,
      filename: string,
      mimetype: string,
      encoding: string
    }
    export interface FileUploadArgs {
      file: IFile,
      rename: boolean
      catalog?: boolean
      uploadContext?: string
      isUserSpecific?: boolean
      virtualPath?: string
      filename?: string
    }


    export interface IReactoryFileService extends Reactory.Service.IReactoryDefaultService {

      uploadFile(uploadArgs: FileUploadArgs): Promise<Reactory.IReactoryFileModel>

      getContentBytes(path: string): number;

      getContentBytesAsString(path: string, encoding: BufferEncoding): string;

      removeFilesForContext(context: string): Promise<Reactory.IReactoryFileModel[]>;

      getFileModelsForContext(context: string): Promise<Reactory.IReactoryFileModel[]>;

      /**
       * Fetches remote file and saves it to the local instance.
       * @param url 
       * @param headers 
       * @param save 
       * @param options 
       */
      getRemote(url: string, method: string, headers: HeadersInit, save: boolean, options?: { ttl?: number, sync?: boolean, owner?: ObjectID, permissions?: Reactory.IReactoryFilePermissions, public: boolean }): Promise<Reactory.IReactoryFileModel>

      setFileModel(file: IReactoryFileModel): Promise<Reactory.IReactoryFileModel>;

      getFileModel(id: string): Promise<Reactory.IReactoryFileModel>;

      sync(): Promise<Reactory.IReactoryFileModel[]>;

      clean(): Promise<Reactory.IReactoryFileModel[]>;
    }

    export type OrganizationImageType = string | "logo" | "avatar";
    export interface IReactoryOrganizationService extends Reactory.Service.IReactoryDefaultService {

      setOrganization(id: string, updates: { name?: string, code?: string, color?: string, logo?: string }): Promise<IOrganizationDocument>

      uploadOrganizationImage(id: string, file: IFile, imageType: OrganizationImageType): Promise<IOrganizationDocument>

      get(id: string): Promise<IOrganizationDocument>

    }

    /**
     * interface definition for a form service that will manage access to forms for users.
     */
    export interface IReactoryFormService extends Reactory.Service.IReactoryDefaultService {
      /**
       * Provide a list of forms for the current logged in user context / partner context
       */
      list(): Promise<Reactory.IReactoryForm[]>

      /**
       * Persists the form to storage
       * @param form 
       */
      save(form: Reactory.IReactoryForm, user_options?: any): Reactory.IReactoryForm;

      /**
       * 
       * @param form 
       */
      delete(form: Reactory.IReactoryForm): boolean
    }
  }

  export interface IPagingRequest {
    page: number
    pageSize: number
  }

  export interface IPagingResult {
    total: number
    page: number
    hasNext: boolean
    pageSize: number
  }

  export interface IPagedResponse<T> {
    paging: IPagingResult,
    items: T[]
    [key: string]: any
  }

  export type LOG_TYPE = string | "debug" | "warn" | "error"
  export interface IReactoryContext {
    id: string,
    user: Reactory.IUserDocument
    partner: Reactory.IReactoryClientDocument
    getService<T extends Reactory.Service.IReactoryService>(fqn: string, props?: any, context?: Reactory.IReactoryContext): T,
    hasRole(role: string, partner?: Reactory.IReactoryClientDocument): boolean
    log(message: string, meta?: any, type?: LOG_TYPE, clazz?: string): void
    [key: string]: any
  }

  export interface IExecutionContextProvider {
    getContext: (currentContext: IReactoryContext) => Promise<IReactoryContext>
  }

  /**
   * Interface for the 
   */
  export interface IFileImportProcessorEntry {
    id: string
    name: string
    order: number
    serviceFqn: string
    started?: Date
    finished?: Date
    status: string
    responses: any[]
  }

  /**
   * Import file types that can potentially be supported
   */
  export type ImportFileEnums = string | "application/json" |
    "text/csv" | "application/xml" | "application/octet"

  /**
   * Interface for the UserImportFile type.
   * Used in upload and processing user data from 
   * external file sources.
   */
  export interface IImportFile extends Mongoose.Document {
    id: string
    file: IReactoryFile | IReactoryFileModel,
    preview: any[],
    options?: {
      delimeter: string
      textQualifier: string
      firstRow: string
      columnMappings: any[]
    }
    mime?: ImportFileEnums,
    status: string
    processors: IFileImportProcessorEntry[]
    rows: number
  }

  /**
   * Interface for User File Import
   */
  export interface IReactoryFileImportPackage {
    organization: any
    owner: any
    options?: {
      delimeter: string
      textQualifier: string
      firstRow: string
      columnMappings: any[]
    }
    files: IImportFile[]
    status: string,
    processors: IFileImportProcessorEntry[],
    rows: number,
    started: Date,
  }

  export interface IReactoryFileImportPackageDocument extends Mongoose.Document, IReactoryFileImportPackage { }

  export type ReactoryFileImportPackageDocument = Mongoose.Model<IReactoryFileImportPackageDocument>;

  /**
   * The IProcessor interface is a simplistic data processing interface
   */
  export interface IProcessor extends Service.IReactoryContextAwareService {
    /**
     * Used to process a request with any params.
     * @param params - of any type, the processor itself has to be able to interpret the input
     * @param next - if the  
     */
    process(params: any, next?: IProcessor): Promise<any>
  }
  export interface IReactoryImportPackageManager extends Service.IReactoryContextAwareService {
    /**
     * Start a package and process all the data inputs
     * @param workload_id 
     * @param file_ids 
     * @param processors 
     */
    start(workload_id: string, file_ids: string[], processors: string[]): Promise<any>
    stop(workload_id: string, file_ids: string[]): Promise<any>
    delete(workload_id: string): Promise<any>
    addFile(workload_id: string, file: IReactoryFileModel): Promise<any>
    removeFile(workload_id: string, file_id: string): Promise<any>
    previewFile(workload_id: string, file_id: string, processors: string[]): Promise<any>
  }



  export interface CoreSimpleResponse {
    success: Boolean
    message: String
    payload?: any
  }

  export interface ReactorySetRolesArgs {
    user_id: ObjectID,
    id: ObjectID,
    roles: string[]
  }

  export interface ReactoryCreateMembershipArgs {
    user_id: ObjectID,
    organization?: ObjectID,
    businessUnit?: ObjectID,
    roles: string[]
  }
}
