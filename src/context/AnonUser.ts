import {
  ObjectId,
  Document,
  UpdateQuery,
  AnyObject,
  PopulateOptions,
  QueryOptions,
  SaveOptions,
  ToObjectOptions,
  Require_id,
  UpdateWithAggregationPipeline,
  PathsToValidate,
  pathsToSkip,
  Model,
  Query,
  FlattenMaps,
  DocumentSetOptions,
  MergeType,
  Types
} from "mongoose";

export const ReactoryAnonUser: Reactory.Models.IUserDocument = {
  id: null,
  email: "anon@anons.any",
  firstName: "Anon",
  lastName: "Anonymous",
  roles: ["ANON"],
  memberships: [] as Types.Array<Reactory.Models.IMembershipDocument>,
  validatePassword: function (password: string): Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  $assertPopulated: function <Paths = {}>(
    path: string | string[],
    values?: Partial<Paths>
  ): Omit<Reactory.Models.IUserDocument, keyof Paths> & Paths {
    throw new Error("Function not implemented.");
  },
  $clone: function (): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  $getAllSubdocs: function (): Document<any, any, any>[] {
    throw new Error("Function not implemented.");
  },
  $ignore: function (path: string): void {
    throw new Error("Function not implemented.");
  },
  $isDefault: function (path: string): boolean {
    throw new Error("Function not implemented.");
  },
  $isDeleted: function (val?: boolean): boolean {
    throw new Error("Function not implemented.");
  },
  $getPopulatedDocs: function (): Document<any, any, any>[] {
    throw new Error("Function not implemented.");
  },
  $inc: function (
    path: string | string[],
    val?: number
  ): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  $isEmpty: function (path: string): boolean {
    throw new Error("Function not implemented.");
  },
  $isValid: function (path: string): boolean {
    throw new Error("Function not implemented.");
  },
  $locals: undefined,
  $markValid: function (path: string): void {
    throw new Error("Function not implemented.");
  },
  $model: function <
    ModelType = Model<
      unknown,
      {},
      {},
      {},
      Document<unknown, {}, unknown> & Omit<Required<{ _id: unknown }>, never>,
      any
    >
  >(name: string): ModelType {
    throw new Error("Function not implemented.");
  },
  $op: "validate",
  $session: undefined,
  //@ts-ignore
  $set: function (
    path: string | Record<string, any>,
    val: any,
    type: any,
    options?: DocumentSetOptions
  ): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  $where: undefined,
  collection: undefined,
  db: null,
  deleteOne: function (
    options?: QueryOptions<unknown>
  ): Promise<Reactory.Models.IUserDocument> {
    throw new Error("Function not implemented.");
  },
  depopulate: function (
    path?: string | string[]
  ): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  directModifiedPaths: function (): string[] {
    throw new Error("Function not implemented.");
  },
  //@ts-ignore
  equals: function (doc: Document<ObjectId, any, any>): boolean {
    return false
  },
  get: function (path: string, type?: any, options?: any) {
    throw new Error("Function not implemented.");
  },
  getChanges: function (): UpdateQuery<Reactory.Models.IUserDocument> {
    throw new Error("Function not implemented.");
  },
  increment: function (): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  init: function (
    obj: AnyObject,
    opts?: AnyObject
  ): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  invalidate: function (
    path: string,
    errorMsg: string | NativeError,
    value?: any,
    kind?: string
  ): NativeError {
    throw new Error("Function not implemented.");
  },
  isDirectModified: function (path: string | string[]): boolean {
    throw new Error("Function not implemented.");
  },
  isDirectSelected: function (path: string): boolean {
    throw new Error("Function not implemented.");
  },
  isInit: function (path: string): boolean {
    throw new Error("Function not implemented.");
  },
  isModified: function (path?: string | string[]): boolean {
    throw new Error("Function not implemented.");
  },
  isNew: false,
  isSelected: function (path: string): boolean {
    throw new Error("Function not implemented.");
  },
  markModified: function (path: string, scope?: any): void {
    throw new Error("Function not implemented.");
  },
  modifiedPaths: function (options?: { includeChildren?: boolean }): string[] {
    throw new Error("Function not implemented.");
  },
  overwrite: function (obj: AnyObject): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  $parent: function (): Document<any, any, any> {
    throw new Error("Function not implemented.");
  },
  populate: function <Paths = {}>(
    path: string | PopulateOptions | (string | PopulateOptions)[]
  ): Promise<MergeType<Reactory.Models.IUserDocument, Paths>> {
    throw new Error("Function not implemented.");
  },
  populated: function (path: string) {
    throw new Error("Function not implemented.");
  },
  replaceOne: function (
    replacement?: AnyObject,
    options?: QueryOptions<unknown>
  ): Query<
    any,
    Reactory.Models.IUserDocument,
    {},
    Reactory.Models.IUserDocument,
    "find"
  > {
    throw new Error("Function not implemented.");
  },
  save: function (
    options?: SaveOptions
  ): Promise<Reactory.Models.IUserDocument> {
    throw new Error("Function not implemented.");
  },
  schema: undefined,
  //@ts-ignore
  set: function (
    path: string | Record<string, any>,
    val: any,
    type: any,
    options?: DocumentSetOptions
  ): Reactory.Models.IUserDocument {
    throw new Error("Function not implemented.");
  },
  //@ts-ignore
  toJSON: function <T = any>(
    options?: ToObjectOptions & { flattenMaps?: true }
  ): FlattenMaps<T> {
    return {} as FlattenMaps<T>;
  },
  toObject: function <T = any>(options?: ToObjectOptions): Require_id<T> {
    throw new Error("Function not implemented.");
  },
  unmarkModified: function (path: string): void {
    throw new Error("Function not implemented.");
  },
  updateOne: function (
    update?:
      | UpdateWithAggregationPipeline
      | UpdateQuery<Reactory.Models.IUserDocument>,
    options?: QueryOptions<unknown>
  ): Query<
    any,
    Reactory.Models.IUserDocument,
    {},
    Reactory.Models.IUserDocument,
    "find"
  > {
    throw new Error("Function not implemented.");
  },
  //@ts-ignore
  validate: function (
    pathsToValidate?: PathsToValidate,
    options?: AnyObject
  ): Promise<void> {
    throw new Error("Function not implemented.");
  },
  //@ts-ignore
  validateSync: function (options: {
    [k: string]: any;
    pathsToSkip?: pathsToSkip;
  }): any {
    throw new Error("Function not implemented.");
  },
  fullName: function (email: boolean): string {
    return `${this.firstName} ${this.lastName}`;
  },
  setPassword: function (password: string): void {
    throw new Error("Function not implemented.");
  },
  hasRole: function (
    clientId: string,
    role: string,
    organizationId?: string,
    businessUnitId?: string
  ): boolean {
    throw new Error("Function not implemented.");
  },
  hasAnyRole: function (
    clientId: string,
    organizationId?: string,
    businessUnitId?: string
  ): boolean {
    throw new Error("Function not implemented.");
  },
  addRole: function (
    clientId: string,
    role: string,
    organizationId?: string,
    businessUnitId?: string
  ): Promise<Reactory.Models.IMembership[]> {
    throw new Error("Function not implemented.");
  },
  removeRole: function (
    clientId: string,
    role: string,
    organizationId: string
  ): Promise<Reactory.Models.IMembershipDocument[]> {
    throw new Error("Function not implemented.");
  },
  removeAuthentication: function (provider: string): Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  getAuthentication: function <T>(
    provider: string
  ): Reactory.Models.IAuthentication<T> {
    throw new Error("Function not implemented.");
  },
  setAuthentication: function <T>(
    authentication: Reactory.Models.IAuthentication<T>
  ): Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  //@ts-ignore
  getMembership: function (
    clientId: string | ObjectId,
    organizationId?: string | ObjectId,
    businessUnitId?: string | ObjectId
  ): Reactory.Models.IMembershipDocument {
    throw new Error("Function not implemented.");
  },
  setLocale: function (locale: string): Promise<unknown> {
    throw new Error("Function not implemented.");
  },
};
