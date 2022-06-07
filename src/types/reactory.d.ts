import { ObjectId } from "mongodb";
import { MimeType } from 'chartjs-node-canvas';
import Mongoose from "mongoose";
import fs from 'fs';
import ExcelJS from 'exceljs';
import { TemplateType } from "./constants";
import { Stream } from "stream";
import { Request, Response } from "express";
import moment from "moment";
import { User } from "@microsoft/microsoft-graph-types";
import { CSSProperties } from "react";
import { Resolvers } from "apollo-client";
import { Container } from "inversify";
import { PagingResult } from "database/types";
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
    //deafult user accounts to create at startup
    users?: any[],
    allowCustomTheme?: boolean,
    createdAt?: Date,
    updatedAt?: Date,
    colorScheme: (colorvalue: string) => any
    getSetting: (name: string, defaultValue?: any, create?: boolean, componentFqn?: string) => any;
    getDefaultUserRoles: () => string[];
    setPassword: (password: string) => void;
  }

  export interface IReactoryClientDocument extends Mongoose.Document, IReactoryClient { }

  export type TReactoryClient = IReactoryClient | IReactoryClientDocument;
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

  /**
   * A Reactory Template Object
   */
  export interface ITemplate {
    enabled: boolean
    organization?: ObjectId | Reactory.IOrganization | Reactory.IOrganizationDocument
    client: any
    businessUnit?: ObjectId | Reactory.IBusinessUnit | Reactory.IBusinessUnitDocument
    user?: ObjectId  | Reactory.IUser | Reactory.IUserDocument
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
    version?: number
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

  export interface IReactoryComment {
    id?: any,
    user: ObjectId | IUser | IUserDocument,
    text: string,
    context: string,
    contextId: String,
    createdAt: string
    published: boolean,
    flagged: boolean,
    upvoted: ObjectId[] | IUser[] | IUserDocument[]
    upvotes: number,
    downvoted: ObjectId[] | IUser[] | IUserDocument[],
    downvotes: number,
    favorite: ObjectId[] | IUser[] | IUserDocument[],
    favorites: number,
  }

  export interface IReactoryCommentDocument extends Mongoose.Document<IReactoryComment> {
    
  }

  export interface IReactoryContent {
    id?: any,
    slug: string,
    title?: string,
    description?: string,
    content: string,
    topics?: string[],

    template?: boolean,
    engine?: string,
    previewInputForm?: string,
    
    createdAt: Date,
    createdBy: ObjectId | IUser | IUserDocument

    updatedAt: Date,
    updatedBy: ObjectId | IUser | IUserDocument

    version?: string
    published: boolean

    comments?: ObjectId[] | IReactoryComment | IReactoryCommentDocument
  }

  export interface IReactoryContentDocument extends Mongoose.Document, IReactoryContent {

  }

  export interface IContentTemplate {
    id: String,

  }

  export interface ToEmail {
    display: string,
    email: string
  }

  export interface EmailAttachment {
    id: ObjectId
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
    id?: string | ObjectId
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

  export interface IOrganizationDocument extends Mongoose.Document<ObjectId>, IOrganization { }

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

  export type TBusinessUnit = IBusinessUnit | IBusinessUnitDocument
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
    organizationId?: string | any
    businessUnit?: IBusinessUnitDocument,
    businessUnitId?: string | any
    enabled?: boolean
    authProvider?: string
    providerId?: string
    lastLogin?: Date,
    user?: IUserDocument
    roles: string[]
  }

  export interface IMembershipDocument extends Mongoose.Types.Subdocument, IMembership { }

  export type TMembership = IMembership | IMembershipDocument
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
    key: String,
    title: String,
    description: String,
    icon: String,
    deleted: Boolean,
    organization?: IOrganization | IOrganizationDocument,
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
    title: String
    name: String
    description: String
    avatar: String
    deleted: Boolean
  }

  export interface ITeamDocument extends Mongoose.Document, ITeam { }


  export interface IProject {
    id?: any,
    name: string
    description?: string
    vision?: string,
    goals?: string[],
    slug?: string,
    shortcode?: string
    startDate?: Date | moment.Moment| number,
    endDate?: Date | moment.Moment | number,
    owner?: IUser | IUserDocument
    avatar?: string
    deleted: Boolean
  }

  export interface IProjectDocument extends Mongoose.Document, IProject {

  }


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
    mobileNumber?: string,
    dateOfBirth?: Date,
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
    addRole(clientId: string, role: string, organizationId?: string, businessUnitId?: string): Promise<IMembership[]>
    removeRole(clientId: string, role: string, organizationId: string): Promise<IMembershipDocument[]>,
    removeAuthentication(provider: string): Promise<boolean>
    getAuthentication(provider: string): IAuthentication
    getMembership(clientId: string | ObjectId, organizationId?: string | ObjectId, businessUnitId?: string | ObjectId): IMembershipDocument
    [key: string]: any
  }

  /**
 * Defines a standard demographic type
 */
  export interface IDemographic {
    id?: any
    organization: string | ObjectId | Reactory.IOrganization,
    type: string,
    key: string,
    icon?: string,
    title: string,
    description?: string,
    deleted: boolean
  }

  export interface IAgeDemographic {
    id?: any
    organization: String | ObjectId | Reactory.IOrganization,
    title: String,
    ageStart: Number,
    ageEnd: Number,
    deleted: Boolean
  }

  export interface IAgeDemographicDocument extends Mongoose.Document, IAgeDemographic { }

  export interface IDemographicDocument extends Mongoose.Document, IDemographic {

  }

  export interface IUserDocument extends Mongoose.Document, IUser {
    memberships: Mongoose.Types.Array<Reactory.IMembershipDocument>
  }

  export interface IUserDemographics {
    race: string | ObjectId | IDemographic | IDemographicDocument
    gender: string | ObjectId | IDemographic | IDemographicDocument
    ageGroup: string | ObjectId | IDemographic | IDemographicDocument
    user: string | ObjectId | IUser | IUserDocument
    team: string | ObjectId | ITeam | ITeamDocument
    businessUnit: string | ObjectId | IBusinessUnit | IBusinessUnitDocument,
    region: string | ObjectId | IRegion | IRegionDocument
    [key: string]: any
  }

  export interface IUserDemographicDocument extends Mongoose.Document, IUserDemographics { 
    
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
    id?: ObjectId,
    roles: string[]
    partnersIncluded?: ObjectId[],
    partnersExcluded?: ObjectId[],
    usersIndcluded?: ObjectId[],
    usersExcluded?: ObjectId[]
  }

  export interface IReactoryFileRemoteEntry {
    id: string
    url: string
    name?: string,
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
    id: ObjectId,
    hash: number,
    partner: ObjectId,
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
    uploadedBy: ObjectId,
    owner: ObjectId,
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
  
  export interface IFormUIOptions {
    submitProps?: {
      variant?: string | "fab" | "button",
      iconAlign?: string | "left" | "right";
      onClick: () => void,
      href: any,
      [key: string]: any
    },
    showSubmit?: boolean,
    showHelp?: boolean,
    showRefresh?: boolean,
    toolbarStyle?: CSSProperties,
    toolbarPosition?: string,
    buttons?: any[],
    showSchemaSelectorInToolbar?: boolean,
    schemaSelector?: {
      variant?: string | "icon-button" | "dropdown",
      style?: CSSProperties,
      showTitle?: boolean,
      selectSchemaId?: string,
      buttonStyle: CSSProperties,
      buttonVariant: any,
      buttonTitle: string,
      activeColor?: any,
      components: string[]
    },
  }

  export interface IFormUISchema {
    'ui:form'?: IFormUIOptions,
    /**
     * "ui:form" is prefered method to set Form specific settting.
     * 
     */
    'ui:options'?: IFormUIOptions | any,
    'ui:field'?: string | "GridLayout" | "TabbedLayout" | "AccordionLayout" | "SteppedLayout",
    'ui:widget'?: string,

    [key: string]: IUISchema | any
  }
  
  type GridSize = number | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  export interface IGridLayout {
    [key: string]: {
      xs?: GridSize,
      sm?: GridSize,
      md?: GridSize,
      lg?: GridSize,
      xl?: GridSize,
      style?: any
    }
  }

  export interface IGridOptions {
    spacing?: number,
    container?: string | "Paper" | "div",
    containerStyles?: CSSProperties,
  }

  export interface ITabLayout {
    field: string,
    icon?: string,
    title?: string,
    [key: string]: any
  }

  export interface ITabOptions {
    textColor?: string | "primary" | "secondary"
  }
  export interface IUISchema {
    'ui:widget'?: string | "null",
    'ui:options'?: object | "null",
    'ui:field'?: string | "GridLayout" | "TabbedLayout" | "AccordionLayout" | "SteppedLayout",
    'ui:grid-layout'?: IGridLayout[],
    'ui:grid-options'?: IGridOptions,
    'ui:tab-layout'?: IGridLayout[],
    'ui:tab-options'?: IGridOptions,
    [key: string]: IUISchema | any,
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
    formData?: any,
    variables?: Object,
    props?: Object,
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
    onSuccessMethod?: string | "redirect" | "notification" | "function",
    onSuccessUrl?: string,
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
    componentFqn?: string,
    component?: string,
    widget: string
  }

  export interface IFieldMap {
    componentFqn?: string,
    component?: string,
    field: string
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
    uiSchema: IFormUISchema,
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


  /**
   * A reactory Event Bubble Action
   */
  export interface IEventBubbleAction {
    /**
     * The event name
     */
    eventName: string,
    /**
     * Action to take
     */
    action: string | "bubble" | "swallow" | "function",
    /**
     * The fuction FQN if set to function
     */
    functionFqn?: string,
  }
  
  /**
   * Defines the interface definition for a component
   * that is registered in the client kernel.
   */
  export interface IReactoryComponentRegistryEntry {
    nameSpace: string
    name: string
    version: string
    component: any
    tags: string[]
    roles: string[]
    connectors: any[]
    componentType: string
  }

  /**
   * A Reactory Form / Code module.
   * 
   * A module that is defined on a form will be parsed 
   * by the forms collector / forms resolvers.  The 
   * module definitions will automatically add
   * resource dependendies to the form resources 
   * that will allow the ReactoryFormComponent to download
   * and install components in a JIT compiled manner.
   */
  export interface IReactoryFormModule {
    id: string,    
    src?: string,
    url?: string,
    compiled?: boolean,
    signed?:boolean,
    signature?: string,
    compiler?: string | "npm" | "none" | "webpack" | "grunt" | "rollup"
    compilerOptions: any,
    /***
     * When roles are added the API will check the logged in user
     * credentials and will include or exclude the resource based on role 
     */
    roles?: string[],
    fileType?: string,
    components?: IReactoryComponentRegistryEntry
  }


  /**
   * Reactory Form Resource structure
   */
  export interface IReactoryFormResource {
    id?: string
    name: string
    type: string | "css" | "script"
    required?: boolean
    expr?: string
    signed?: boolean
    signature?: string
    signatureMethod?: string
    crossOrigin?: string
    uri: string
  }

  export interface IReactoryForm {
    /**
     * A unique id for the form. When the form is defined on the server side, the id has to be unique
     * across all forms!
     */
    id: string,
    /**
     * Indicates what UI framework the form is built / designed to use.
     * options will be "material" and later "bootstrap" / others.
     */
    uiFramework: string | "material" | "bootstrap",
    /**
     * This indicates the ui framekworks that the form is intended to support.
     */
    uiSupport: string[],
    /**
     * List of scripts or styles sheets that get loaded async for the application to use.
     */
    uiResources?: IReactoryFormResource[],
    title: String,
    tags?: String[],
    display?: boolean,
    className?: String,
    style?: any,
    helpTopics?: String[]
    schema: ISchema | IObjectSchema | IArraySchema,
    sanitizeSchema?: ISchema | IObjectSchema | IArraySchema,
    uiSchema?: IFormUISchema,
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
    fieldMap?: IFieldMap[],
    backButton?: Boolean,
    workflow?: Object,
    noHtml5Validate?: boolean,
    formContext?: any,
    eventBubbles?: IEventBubbleAction[]
    modules?: IReactoryFormModule[]
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
    content: (params: any, context: Reactory.IReactoryContext) => Promise<any>
    resolver: (params: any, context: Reactory.IReactoryContext) => Promise<any>,
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

  /**
   * The module data structure represents a collection of all the services, 
   * workflows, forms, pdf definition 
   */
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
    clientPlugins?: Client.IReactoryPluginDefinition,
    translations?: IReactoryTranslations[]
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

  export type ReactoryServiceTypes = "file" | "data" | "iot" | 
    "user" | "organization" | "businessunit" | "email" | 
    "notification" | "workflow" | "devops" | "plugin" | 
    "custom" | "context" | "integration" | "report";

  export interface IReactoryServiceDependency {
    /**
     * The full service id
     */
    id: string,
    /**
     * The service property alias.
     */
    alias: string
  }

  export type ServiceDependency = string | IReactoryServiceDependency;

  export type ReactoryServiceDependencies = ServiceDependency[]
  export interface IReactoryServiceDefinition {
    /**
     * The service id is similar to a component FQN, 
     * so ids, will be used as nameSpace.name@version
     */
    id: string
    /**
     * A easy to ready name.
     * i.e. My Fileservice
     */
    name: string
    /**
     * Longer description, what does the service do.
     * i.e. My Fileservice is a specific handler for persisting uploaded files to a 
     * backup folder.
     */
    description: string
    /***
     * A function that returns an instance of the service.  Your service 
     * can either run per execution or can run in the context of the service as a singleton
     * across all requests.  
     * 
     * The execution context of the startup account will be that of the server service account.
     * So using singleton instances should be done with care and it is advised to run all services
     * in the execution context of the user where possible.
     */
    service(props: IReactoryServiceProps, context: any): any,
    /**
     * An optional type definition
     */
    serviceType?: ReactoryServiceTypes
    /**
     * Depenency array ['core.FileService@1.0.0', { id: 'core.UserService@1.0.0', alias: 'myUserService' }]
     */
    dependencies?: ReactoryServiceDependencies
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
      query?: string,
      params?: any,
      output?: string,
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

    /**
     * Base interface for a Context Aware Reactory Service.  These services have 
     * a 
     */
    export interface IReactoryContextAwareService extends IReactoryService {
      getExecutionContext(): IReactoryContext
      setExecutionContext(executionContext: IReactoryContext): boolean
    }


    export interface IExcelWriterService extends IReactoryContextAwareService {
      setCellRichText(cell: ExcelJS.Cell, cellProps: any): ExcelJS.Cell;
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
      setTemplate(view: string, template: ITemplate, reactoryClientId?: string | ObjectId, organizationId?: string | ObjectId, businessUnitId?: string | ObjectId, userId?: string | ObjectId): Promise<ITemplate>
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
      getRemote(url: string, method: string, headers: HeadersInit, save: boolean, options?: { ttl?: number, sync?: boolean, owner?: ObjectId, permissions?: Reactory.IReactoryFilePermissions, public: boolean }): Promise<Reactory.IReactoryFileModel>

      setFileModel(file: IReactoryFileModel): Promise<Reactory.IReactoryFileModel>;

      getFileModel(id: string): Promise<Reactory.IReactoryFileModel>;

      getFileSize(file: IReactoryFileModel): number;

      sync(): Promise<Reactory.IReactoryFileModel[]>;

      clean(): Promise<Reactory.IReactoryFileModel[]>;

      deleteFile(fileModel: Reactory.IReactoryFileModel): boolean

      catalogFile(filename: string, mimetype?: string, alias?: string,
        context?: string, 
        partner?: IReactoryClient | IReactoryClientDocument, 
        user?: IUser | IUserDocument): Promise<IReactoryFileModel>;

      generateFileChecksum(filename: string, algo: string): Promise<string>
    }

    export type OrganizationImageType = string | "logo" | "avatar";

    export type PagedOrganizations = {
      paging: PagingResult,
      organizations: IOrganization[] | IOrganizationDocument[]
    }

    export type OrganizationsForUser = IOrganization[] | IOrganizationDocument[]
    export interface IReactoryOrganizationService extends Reactory.Service.IReactoryDefaultService {

      setOrganization(id: string, updates: { name?: string, code?: string, color?: string, logo?: string }): Promise<IOrganizationDocument>

      uploadOrganizationImage(id: string, file: IFile, imageType: OrganizationImageType): Promise<IOrganizationDocument>

      get(id: string): Promise<IOrganizationDocument>

      findWithName(name: string): Promise<IOrganizationDocument>

      create( name: string ): Promise<IOrganizationDocument>

      findBusinessUnit(organization_id: string | number | ObjectId, search: string | number | ObjectId ): Promise<IBusinessUnitDocument>

      createBusinessUnit(organization_id: string | number | ObjectId, name: string): Promise<IBusinessUnitDocument>

      findTeam(organization_id: string | number | ObjectId, search: string | number | ObjectId ): Promise<Reactory.ITeamDocument>

      createTeam(organization_id: string | number | ObjectId, search: string | number | ObjectId ): Promise<Reactory.ITeamDocument>

      getOrganizationsForLoggedInUser(search: string, sort: string, direction: string): Promise<OrganizationsForUser>
      
      getPagedOrganizationsForLoggedInUser(search: string, sort: string, direction: string, paging: Reactory.IPagingRequest): Promise<OrganizationsForUser>
    }

    /**
     * interface definition for a form service that will manage access to forms for users.
     */
    export interface IReactoryFormService extends Reactory.Service.IReactoryDefaultService {
      /**
       * Provide a list of forms for the current logged in user context / partner context
       */
      list(): Promise<Reactory.IReactoryForm[]>

      /***
       * Returns a list of globals that are available in the eco system
       */
      globals(): Promise<Reactory.IReactoryForm[]>

      /**
       * Return a form with a given id
       * @param id 
       */
      get(id: string): Promise<Reactory.IReactoryForm>;

      /**
       * Persists the form to storage
       * @param form 
       */
      save(form: Reactory.IReactoryForm, user_options?: any): Reactory.IReactoryForm;

      /**
       * Delete a form from the data store
       * @param form 
       */
      delete(form: Reactory.IReactoryForm): boolean

      /**
       * 
       * @param form Returns an array of resources for the form
       */
      getResources(form: Reactory.IReactoryForm): Promise<Reactory.IReactoryFormResource[]>
    }

    export interface IReactoryModuleCompilerService extends Reactory.Service.IReactoryDefaultService {

      /**
       * 
       * @param module Compiles a ReactoryFormModule
       */
      compileModule(module: Reactory.IReactoryFormModule): Promise<Reactory.IReactoryFormResource>      
    }

    export interface IReactoryUserService extends Reactory.Service.IReactoryDefaultService {

      createUser(userInput: Reactory.IUser, organization: Reactory.IOrganization): Promise<Reactory.IUserDocument>;

      updateUser(userInput: Reactory.IUser): Promise<Reactory.IUserDocument>

      findUserWithEmail(email: string): Promise<Reactory.IUserDocument>

      findUserById(id: string | number | ObjectId): Promise<Reactory.IUserDocument>

      getUserPeers(id: string | number | ObjectId, organization_id: string | ObjectId): Promise<Reactory.IOrganigramDocument>

      setUserPeers(user: IUserDocument, peers: any, organization: IOrganizationDocument, allowEdit: boolean, confirmedAt?: Date): Promise<IOrganigramDocument>

      setUserDemographics(userId: string, organisationId: string, membershipId?:
      string, dob?: Date, businessUnit?: string, gender?: string, operationalGroup?: string,
      position?: string, race?: string, region?: string, team?: string): Promise<Reactory.IUserDemographics | Reactory.IUserDemographicDocument>
      
    }

    export interface IReactoryUserDemographicsService extends Reactory.Service.IReactoryDefaultService {

      setUserDemographics(demographics: Reactory.IUserDemographics, user: Reactory.IUser): Promise<IUserDemographicDocument>
      
    }

    export interface IReactoryWorkflowService extends Reactory.Service.IReactoryDefaultService {
      startWorkflow(workflow_id: string, input: any): Promise<any>
      stopWorkflow(worflow_id: string, instance: string): Promise<any>
      workflowStatus(worflow_id: string, instance: string): Promise<any>
      clearWorkflows(): Promise<any>
    }

    export interface IFetchAuthenticationProvder {

      /**
       * Authenticates a fetch request before the call is made.
       * This would be used to set headers for which 
       * we already have the request data.
       * @param request 
       */
      authenticateRequestSync(request: any): void; 
      
      /**
       * Authenticates a fetch request asynchronously
       * @param request 
       */
      authenticateRquest(request?: any): Promise<any>

    }


    export interface IFetchHeaderProvider {

      /**
       * Decorates a Fetch request with any custom headers
       * @param request 
       */
      decorateRequestHeaderSync(request: any): void;

      /**
       * decorates a fetch request with custom headers asynch
       * @param request 
       */
      decorateRequestHeader(request: any): Promise<any>;

    }


    export interface IFetchService extends Reactory.Service.IReactoryDefaultService {

      /**
       * 
       * @param provider 
       */
      setAuthenticationProvider(provider: IFetchAuthenticationProvder): void

      /**
       * 
       * @param provider 
       */
      setHeaderProvider(provider: IFetchHeaderProvider): void;

      getJSON<T>(url: string, 
        args?: any, authenticate?: boolean, 
        charset?: string): Promise<T>

      postJSON<T>(url: string,
        args?: any, authenticate?: boolean,
        charset?: string): Promise<T>

      putJSON<T>(url: string,
        args?: any, authenticate?: boolean,
        charset?: string): Promise<T>

      deleteJSON<T>(url: string,
        args?: any, authenticate?: boolean,
        charset?: string): Promise<T>

      
      fetch<T>(url: string, 
        args?: any, 
        authenticate?: boolean, 
        contentType?: string,
        defaultHeaders?: boolean        
        ): Promise<Response | T>
    }


    export interface IPDFStyleDefinition {
      alignment?: string | "left" | "right" | "justify" | "center"
      font?: string
      fontSize?: string
      margin?: [number, number?, number?, number?]
      lineHeight?: number,
      bold?: boolean,
      italics?: boolean,
      color?: string
      [key: string]: any,
    }
    export interface IPDFContentNode {
      style?: string[],
      margin?: [number] | [number, number] | [number, number, number] | [number, number, number, number]
      [key: string]: any
    }

    export interface IPDFTableLayout {
      fillColor: (rowIndex: number, node: any, columnIndex: number) => any
    }

    export interface IPDFDocumentDefinition {
      filename: string,
      info?: {
        title?: string,
        author?: string,
        subject?: string,
        keywords?: string,
      },
      content: IPDFContentNode[],
      header?: (currentPage: number, pageCount: number) => IPDFContentNode[],
      footer?: (currentPage: number, pageCount: number, pageSize: number) => IPDFContentNode[],
      images?: {
        [key: string]: string | Buffer,        
      },
      pageMargins: [number, number, number, number],
      styles: {
        [key: string]: IPDFStyleDefinition
      },
      tableLayoutOut: {
        [key: string]: IPDFTableLayout
      }
    }

    /**
     * Pdf service that generates PDFs using PDF make 
     */
    export interface IReactoryPdfService extends Reactory.Service.IReactoryDefaultService {

      generate(definition: any, stream: any): Promise<any>

      pdfDefinitions(): Reactory.IReactoryPdfComponent

    }
    
    export interface IReactorySupportService extends Reactory.Service.IReactoryDefaultService {

      createRequest(request: string, description: string, requestType?: string, meta?: any, formId?: string): Promise<IReactorySupportTicket | IReactorySupportTicketDocument>

      updateTicket(ticket_id: string, updates: IReactorySupportTicketUpdate): Promise<IReactorySupportTicket | IReactorySupportTicketDocument>

      attachDocument(ticket_id: string, file: File, name: string): Promise<IReactorySupportTicket | IReactorySupportTicketDocument>

      pagedRequest(filter: IReactorySupportTicketFilter, paging: Reactory.IPagingRequest): Promise<IPagedReactorySupportTickets>
    }

    export interface IReactorySupportServiceStatic {
      new(): IReactorySupportServiceStatic,
      reactory: IReactoryServiceDefinition
    }

    export type TReactorySupportService = IReactorySupportService & IReactorySupportServiceStatic

    /***
     * The Reactory System Service provides wrapper functionality for various core functionality
     * that is share across concerns.
     */
    export interface IReactorySystemService extends Reactory.Service.IReactoryDefaultService {

      /**
       * Return a ReactoryClient item with a given id
       * @param id the id to search / use
       * @param populate (elements to populate)
       */
      getReactoryClient(id: string | ObjectId, populate?: string[]): Promise<TReactoryClient>;
      
      /**
       * Returns a list of cients based on a query input
       * @param query 
       */
      getReactoryClients(query: any): Promise<TReactoryClient[]>

      /**
       * returns a list of menus for a given ReactoryClient 
       * @param client 
       */
      getMenusForClient(client: TReactoryClient): Promise<IReactoryMenu[]>
      /**
       * Run a graphql query against the graph.
       * @param query 
       * @param variables 
       */
      query(query: string, variables: any): Promise<any>
      /**
       * Run a graphql mutation against the graph.
       * @param query
       * @param variables
       */
      mutate(mutation: string, variables: any): Promise<any>
    }

    export interface IReactoryTranslationSerivce extends Reactory.Service.IReactoryDefaultService {
      /**
       * Returns all the translations for a given locale string, if the 
       * local is not provide the syste default will be used as defined on the 
       * process.env.REACTORY_DEFAULT_LOCALE, if no default locale is set the 
       * operating system user default will be used.
       * @param locale - the local string to use
       */
      getTranslations(locale?: string): Promise<IReactoryTranslations> 

      /**
       * Sets a translation item. When using the default service the data will 
       * be validated before being added to the resource collection
       * @param translation
       */
      setTranslation(translation: IReactoryTranslation): Promise<IReactoryTranslation>
      /**
       * Removes a particular translation
       * @param translation
       */
      removeTranslation(translation: IReactoryTranslation): Promise<IReactoryTranslation>

      /**
       * Creates a object from the key structure
       * @param translation
       */
      getResource(translation: IReactoryTranslation): Promise<any>

      /**
       * Creates an object from all the items in translations set
       * @param translations 
       */
      getResources(translations: IReactoryTranslations): Promise<any>
    }

    export interface IReactoryTranslationServiceStatic {
      new(): IReactorySupportServiceStatic,
      reactory: IReactoryServiceDefinition
    }

    export type TReactoryTranslationService = IReactoryTranslationSerivce & IReactoryTranslationServiceStatic
  }

  export interface IReactorySupportTicketFilter {
    assignedTo: string[],
    createdBy: string,
    status: string[],
    reference: string[],    
    searchString: string,
    searchFields: string[],
    startDate: Date,
    endDate: Date,
    dateFields: string[]
    formId: string    
  }

  export interface IReactorySupportTicketUpdate {
    request?: string
    requestType?: string
    description?: string
    status?: string
    comment?: string
    assignTo?: string    
  }

  export interface IReactorySupportTicket {
    id?: any
    request: string
    requestType: string
    description: string
    status: string
    reference: string
    createdBy: ObjectId | IUser | IUserDocument
    createdDate: Date
    updatedDate: Date
    assignedTo: ObjectId | User | IUserDocument
    formId: string
    comments: IReactoryComment[] | IReactoryCommentDocument
    documents: IReactoryFile[] | IReactoryFileModel[]
  }

  export interface IReactorySupportTicketDocument extends Mongoose.Document, IReactorySupportTicket { }

  export interface IPagedReactorySupportTickets {
    paging: IPagingResult
    tickets: IReactorySupportTicket[]
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

  export type SERVICE_LIFECYCLE = "instance" | "singleton";

  export type LOG_TYPE = string | "debug" | "warn" | "error" | "info"

  /**
   * The IReactoryContext is the object should be passed through to all levels of the execution.
   * It contains the logged in user, the memberships and several shortcut utilities that allows
   * all code to be executed with a specific user / application context details.
   */
  export interface IReactoryContext { 
    id: string,
    /**
     * The user account that is associated with this execution 
     */
    user: Reactory.IUserDocument
    /**
     * The partner / application that is currently executing
     */
    partner: Reactory.IReactoryClientDocument
    /**
     * Service activator function that creates / returns a service with the given fqn (fully qualified name)
     * @param fqn - the FQN for the service to activate. 
     * @param props - any properties to pass to the service if required.
     * @param context - a specific context if you want to execute as different user, otherwise current context is used
     * @param lifeCycle - the lifecycle type for the service, either instance or singleton
     */
    getService<T extends Reactory.Service.IReactoryService>(fqn: string, props?: any, context?: Reactory.IReactoryContext, lifeCycle?: SERVICE_LIFECYCLE): T,    
    /**
     * Logging method to write logs.
     * @param message - the message to log
     * @param meta - any meta data
     * @param type - "error", "info", "debug" or "warning"
     * @param clazz - the class or component id
     */
    log(message: string, meta?: any, type?: LOG_TYPE, clazz?: string): void
    /**
     * Logs a debug message to the console / log output
     * @param message - message to log out
     * @param meta - any meta data
     * @param clazz - the class or component id
     */
    debug(message: string, meta?: any, clazz?: string): void
    /**
     * Logs a warning message to the console / log output
     * @param message - message to log out     
     * @param meta - any meta data
     * @param clazz - the class or component id
     */
    warn(message: string, meta?: any, clazz?: string): void
    /**
     * Logs an error message to the console / log output
     * @param message - message to log out
     * @param meta - any meta data
     * @param clazz - the class or component id
     */
    error(message: string, meta?: any, clazz?: string): void
    /**
     * Write an info message to the console / log output
     * @param message - message to log out
     * @param meta - any meta data
     * @param clazz - the class or component id
     */
    info(message: string, meta?: any, clazz?: string): void
    state: {
      [key: string]: any
    },
    /**
     * The current response object
     */
    $response: Response,
    /**
     * The current request object
     */
    $request: Request,
    /**
     * current color palette
     */
    colors: any,
    /**
     * IoC container
     */
    container: Container,
    /**
     * Modules that are currently available for this 
     * instance
     */
    modules: Reactory.IReactoryModule[]
    /**
     * utility tools
     */
    utils: {
      /**
       * creates a hash from an object
       */
      hash: (obj: any) => number
    },
    /**
     * Function to help check for specific permission
     */
    hasRole: (role: string, partner?: Reactory.IPartner, organization?: Reactory.IOrganizationDocument, businessUnit?: Reactory.IBusinessUnitDocument) => boolean,    
    [key: string]: any
  }

  /**
   * Execution context provider interface. 
   * A class that is configured as a IExecutionContextProvider can be injected
   * into the execution context by configuring the Application client configuration.
   */
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

  export interface IProcessorParams {
    import_package?: IReactoryFileImportPackageDocument,

    [key: string]: any
  }

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

  interface IPackageManagerState {
    processors: Reactory.IFileImportProcessorEntry[],
    file?: Reactory.IImportFile,
    processor_index: number,
    busy: boolean
    started: boolean
    [key:string]: any
  }

  export interface IReactoryImportPackageManager extends Service.IReactoryContextAwareService {
    
    state: IPackageManagerState

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

    /**
     * Returns the next processor if the service is started.
     * Every time this function is called the internal state of the class is updated.
     */
    getNextProcessor(): Reactory.IProcessor
  }



  export interface CoreSimpleResponse {
    success: Boolean
    message: String
    payload?: any
  }

  export interface ReactorySetRolesArgs {
    user_id: ObjectId,
    id: ObjectId,
    roles: string[]
  }

  export interface ReactoryCreateMembershipArgs {
    user_id: ObjectId,
    organization?: ObjectId,
    businessUnit?: ObjectId,
    roles: string[]
  }


  export interface IChartProps {
    folder: string,
    file: string,
    width?: number,
    height?: number
    resolveCDN?: boolean,
    data: any,
    options?: any,
    mime?: MimeType,
    context?: Reactory.IReactoryContext
  }

  export interface IChartResult {
    file: string,
    additional?: {
      cdn: string
    }
  }

  export interface ChartJSDataLabelContext {
    active: boolean,
    chart: any,
    dataIndex: number,
    dataset: any,
    datasetIndex: number
  }


  export interface IResolverStruct {
    Query?: Resolvers,
    Mutation?: Resolvers,
    [key: string]: Resolvers,
  }
  
  export interface IReactoryResolver {    
    resolver?: IResolverStruct
  }


  export interface IReactoryMenu {
    [key: string]: any
  }

  export interface IReactoryTask {
    id?: any
    title: string 
    description?: string
    assignedTo?: string | ObjectId | IUser | IUserDocument    
    comments?: IReactoryComment[] | IReactoryCommentDocument
    attachments?: IReactoryFile[] | IReactoryFileModel[]
    shortCode?: string
    slug?: string
    label: string[]
    percentComplete?: number
    timeline?: ITimeline[]
    completionDate?: Date
    startDate?: Date
    dueDate?: Date,
    createdBy: string | ObjectId | IUser | IUserDocument
    createdAt: Date
    updatedAt?: Date
  }

  export interface IReactoryTaskDocument extends Mongoose.Document, IReactoryTask {

  }

  export type TReactoryTask = IReactoryTask | IReactoryTaskDocument

  
  
  /**
   * Data structure that represents the Reactory Api Status
   */
  export interface IReactoryApiStatus {
    id: string,
    menus: ObjectId[] | IReactoryMenu[]
    [key: string]: any
  }


  export interface IReactoryTranslationRevision {
    id: any
    changed: Date
    translation: string
    translator: IUser
    reason: string
  }

  export interface IReactoryTranslation {
    id?: any,
    partner: Reactory.IReactoryClient | Reactory.IReactoryClientDocument
    organization: Reactory.IOrganization | Reactory.IOrganizationDocument    
    key: string,
    locale: string,
    created: Date,
    translator: IUser
    namespace?: string
    translation: string
    resource?: any
    version: number
    revisions: IReactoryTranslationRevision[]
  }

  export interface IReactoryTranslationDocument extends Mongoose.Document,IReactoryTranslation {

  }
  export interface IReactoryTranslations {
    id: string
    locale: string
    translations: IReactoryTranslation[]
    resources?: any
  }

  export interface IBooleanResponse {
    success: boolean,
    message?: string
  }

  export interface IDataItemResponse<T> {
    success: boolean
    message?: string
    data: T
  }

  export interface IDataItemsReponse<T> {
    success: boolean
    message?: string
    paging?: IPagingResult
    data: T[]
  }
}
