
// Fix for ES6 not being able to extend from Builtin JavasScript classes
// like Error and Array
function ExtendableBuiltin(cls) {
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
export default class ApiError extends ExtendableBuiltin(Error) {
  constructor(message, meta = undefined) {
    super(message);
    this.message = message;
    this.meta = meta;
    this.extensions = this.meta;
  }
}

export class RecordNotFoundError extends ApiError {
  constructor(message, recordType = 'General', meta = { }) {
    super(message, meta);
    this.RecordType = recordType;
    this.code = `${recordType.toUpperCase()}-404`;
  }
}

export class UserExistsError extends ApiError {
  constructor(message, meta = { }) {
    super(message);
    this.message = message;
    this.meta = meta;
    this.code = 'USER-409';
  }
}

export class UserNotFoundException extends ApiError {
  constructor(message, meta = {}) {
    super(message, meta);
    this.code = 'USER-404';
  }
}

export class ReactoryClientValidationError extends ApiError {
  constructor(message, validationErrors, meta = { }) {
    super(message, meta);
    this.validationErrors = validationErrors;
  }
}

export class UserValidationError extends ApiError {
  constructor(message, validationErrors, meta = { }) {
    super(message, meta);
    this.validationErrors = validationErrors;
  }
}

export class OrganizationValidationError extends ApiError {
  constructor(message, validationErrors, meta = { }) {
    super(message, meta);
    this.validationErrors = validationErrors;
  }
}

export class OrganizationNotFoundError extends ApiError {
  constructor(message, orgId, meta = {}) {
    super(message, meta);
    this.orgId = orgId;
  }
}

export class OrganizationExistsError extends ApiError {
  constructor(message, meta = { }) {
    super(message, meta);
    this.code = 'ORGANIZATION-409';
  }
}

export class BusinessUnitExistsError extends ApiError {
  constructor(message, meta = {}) {
    super(message, meta);
    this.code = 'BUSINESS-UNIT-409';
  }
}

export class ValidationError extends ApiError {
  constructor(message, meta = {}) {
    super(message, meta);
    this.code = 'VALIDTION-403';
  }
}

export class SystemError extends ApiError {
  constructor(message, meta = { }) {
    super(message, meta);
    this.code = 'SYSTEM-500';
  }
}
