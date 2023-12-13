
// Fix for ES6 not being able to extend from Builtin JavasScript classes
// like Error and Array
function ExtendableBuiltin(cls: any) {
  function ExtendableBuiltin() { // eslint-disable-line no-shadow
    cls.apply(this, arguments); // eslint-disable-line prefer-rest-params
  }
  ExtendableBuiltin.prototype = Object.create(cls.prototype);
  Object.setPrototypeOf(ExtendableBuiltin, cls);

  return ExtendableBuiltin;
}
/**
 * Base Error class for custom types.
 * meta info should contain the following items:
 *  * correlationId
 * */
// @ts-ignore
export default class ApiError extends ExtendableBuiltin(Error) {
  public message: string;
  public meta: any;
  public extensions: any;

  constructor(message: string, meta: any = undefined) {
    super(message);
    this.message = message;
    this.meta = meta;
    this.extensions = this.meta;
  }
}

export class RecordNotFoundError extends ApiError {
  public RecordType: string;
  public code: string;

  constructor(message: string, recordType = 'General', meta = {}) {
    super(message, meta);
    this.RecordType = recordType;
    this.code = `${recordType.toUpperCase()}-404`;
  }
}

export class UserExistsError extends ApiError {
  public code: string;

  constructor(message: string, meta = {}) {
    super(message, meta);    
    this.code = 'USER-409';
  }
}

export class BadRequestError extends ApiError {
  public code: string;

  constructor(message: string, meta ={}) {
    super(message, meta);
    this.message = message;
    this.meta = meta;
    this.code = '400';
  }
}

export class InsufficientPermissions extends ApiError {
  public code: string;

  constructor(message: string, meta = {}) {
    super(message, meta);
    this.message = message;
    this.meta = meta;
    this.code = 'USER-401';
  }
}

export class UserNotFoundException extends ApiError {
  public code: string;

  constructor(message: string, meta = {}) {    
    super(message, meta);
    this.code = 'USER-404';
  }
}

export class ReactoryClientValidationError extends ApiError {
  public validationErrors: any;

  constructor(message: string, validationErrors: any, meta = {}) {
    super(message, meta);
    this.validationErrors = validationErrors;
  }
}

export class UserValidationError extends ApiError {
  public validationErrors: any;
  constructor(message: string, validationErrors: any, meta = {}) {
    super(message, meta);
    this.validationErrors = validationErrors;
  }
}

export class OrganizationValidationError extends ApiError {
  public validationErrors: any;
  constructor(message: string, validationErrors: any, meta = {}) {
    super(message, meta);
    this.validationErrors = validationErrors;
  }
}

export class OrganizationNotFoundError extends ApiError {
  public orgId: string;

  constructor(message: string, orgId: string, meta = {}) {
    super(message, meta);
    this.orgId = orgId;
  }
}

export class OrganizationExistsError extends ApiError {
  public code: string;

  constructor(message: string, meta = {}) {
    super(message, meta);
    this.code = 'ORGANIZATION-409';
  }
}

export class BusinessUnitExistsError extends ApiError {
  public code: string;
  constructor(message: string, meta = {}) {
    super(message, meta);
    this.code = 'BUSINESS-UNIT-409';
  }
}
export class ValidationError extends ApiError {
  public code: string;
  constructor(message: string, meta = {}) {
    super(message, meta);
    this.code = 'VALIDTION-403';
  }
}

export class SystemError extends ApiError {
  public code: string;
  constructor(message: string, meta = {}) {
    super(message, meta);
    this.code = 'SYSTEM-500';
  }
}


