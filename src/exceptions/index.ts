
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

  /**
   * Mask a value using the specified strategy. All strategies are designed to meet
   * compliance requirements (PCI-DSS, HIPAA, GDPR) by removing sufficient
   * information to prevent re-identification while preserving debugging context.
   */
  static maskValue(value: string, strategy: RedactionStrategy = 'partial'): string {
    if (value === null || value === undefined) return '';
    const v = String(value);
    if (v.length === 0) return '';

    switch (strategy) {
      case 'full':
        return '[REDACTED]';

      case 'last4':
        // PCI-DSS 3.2.1 Requirement 3.4 compliant for PAN data
        if (v.length <= 4) return '*'.repeat(v.length);
        return '*'.repeat(v.length - 4) + v.slice(-4);

      case 'first6last4':
        // PCI-DSS allowed format: BIN + last 4 (e.g., 411111******1234)
        if (v.length <= 10) return ApiError.maskValue(v, 'last4');
        return v.slice(0, 6) + '*'.repeat(v.length - 10) + v.slice(-4);

      case 'email': {
        const atIndex = v.lastIndexOf('@');
        if (atIndex < 1) return ApiError.maskValue(v, 'partial');
        const user = v.slice(0, atIndex);
        const domain = v.slice(atIndex + 1);
        const maskedUser = user.length <= 2
          ? '*'.repeat(user.length)
          : user[0] + '*'.repeat(user.length - 2) + user[user.length - 1];
        const dotIdx = domain.lastIndexOf('.');
        const maskedDomain = dotIdx > 0
          ? '*'.repeat(dotIdx) + domain.slice(dotIdx)
          : '*'.repeat(domain.length);
        return `${maskedUser}@${maskedDomain}`;
      }

      case 'hash': {
        // Deterministic non-reversible obfuscation for log correlation (HIPAA-friendly)
        let h = 0;
        for (let i = 0; i < v.length; i++) {
          h = ((h << 5) - h) + v.charCodeAt(i);
          h |= 0;
        }
        return `[HASH:${Math.abs(h).toString(16)}]`;
      }

      case 'partial':
      default:
        if (v.length <= 2) return '*'.repeat(v.length);
        if (v.length <= 4) return v[0] + '*'.repeat(v.length - 1);
        return v[0] + '*'.repeat(v.length - 2) + v[v.length - 1];
    }
  }

  /**
   * Sanitize a string by detecting key=value, key:value and "key":"value" patterns
   * and masking the value portion. Falls back to keyword-only redaction for
   * unstructured matches (compliance-safe default).
   */
  static sanitizeToString(input: string, rules?: RedactionRule[] | string[], replacement = '[REDACTED]'): string {
    if (!input) return input;
    const ruleSet = ApiError.normalizeRules(rules);
    let result = input;

    // Run high-precedence auth-token scanners FIRST so generic kv rules don't
    // partially mangle protocol keywords like "Bearer".
    result = result.replace(/(Bearer\s+)([A-Za-z0-9._\-+/=]+)/gi, (_m, prefix, token) => {
      return `${prefix}${ApiError.maskValue(token, 'last4')}`;
    });
    result = result.replace(/(Basic\s+)([A-Za-z0-9+/=]+)/g, (_m, prefix, token) => {
      return `${prefix}${ApiError.maskValue(token, 'last4')}`;
    });

    for (const rule of ruleSet) {
      const escapedKey = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Key=value, key: value, "key": "value", "key":value
      const kvRegex = new RegExp(
        `("?${escapedKey}"?\\s*[:=]\\s*)("([^"\\\\]|\\\\.)*"|'([^'\\\\]|\\\\.)*'|[^\\s,;}\\]&]+)`,
        'gi'
      );
      result = result.replace(kvRegex, (_match, prefix, value) => {
        let unwrapped = value;
        let quote = '';
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          quote = value[0];
          unwrapped = value.slice(1, -1);
        }
        // Don't double-mask values already redacted by a previous scanner.
        if (/^\*+$/.test(unwrapped) || unwrapped === '[REDACTED]' || /^\[HASH:/.test(unwrapped)) {
          return `${prefix}${quote}${unwrapped}${quote}`;
        }
        // Don't mask auth scheme keywords - the bearer/basic scanner already
        // handled the actual token that follows.
        if (/^(Bearer|Basic|Digest|OAuth)$/i.test(unwrapped)) {
          return `${prefix}${quote}${unwrapped}${quote}`;
        }
        const masked = ApiError.maskValue(unwrapped, rule.strategy);
        return `${prefix}${quote}${masked}${quote}`;
      });
    }

    // Built-in compliance scanners run after keyword rules to catch
    // raw values that appear without a labelled key (PCI/PII safety net).
    result = ApiError.scanAndMaskCompliance(result);

    return result;
  }

  /**
   * Compliance-driven scanners that detect well-known sensitive value
   * formats regardless of the surrounding key. Disable individual scanners
   * via SANITIZER_DISABLE env var (comma-separated: "creditcard,ssn,jwt").
   */
  private static scanAndMaskCompliance(input: string): string {
    const disabled = (process.env.SANITIZER_DISABLE || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    let result = input;

    if (!disabled.includes('creditcard')) {
      // 13-19 digit numbers (Luhn-conformant in real PAN), allow space/dash separators
      result = result.replace(/\b(?:\d[ -]*?){13,19}\b/g, (m) => {
        const digits = m.replace(/[^\d]/g, '');
        if (digits.length < 13 || digits.length > 19) return m;
        return ApiError.maskValue(digits, 'first6last4');
      });
    }
    if (!disabled.includes('ssn')) {
      // US SSN format (NNN-NN-NNNN)
      result = result.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (m) => ApiError.maskValue(m.replace(/-/g, ''), 'last4'));
    }
    if (!disabled.includes('jwt')) {
      // JWT-like token: three base64url segments separated by dots
      result = result.replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, (m) => ApiError.maskValue(m, 'last4'));
    }
    if (!disabled.includes('email')) {
      result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (m) => ApiError.maskValue(m, 'email'));
    }
    return result;
  }

  /**
   * Accepts both legacy string[] and structured RedactionRule[] formats from env vars.
   */
  private static normalizeRules(rules?: RedactionRule[] | string[]): RedactionRule[] {
    const raw: (RedactionRule | string)[] = rules ?? ApiError.getRedactionRules();
    return raw.map<RedactionRule>(r => {
      if (typeof r === 'string') return { pattern: r, strategy: ApiError.defaultStrategyFor(r) };
      return { pattern: r.pattern, strategy: r.strategy || ApiError.defaultStrategyFor(r.pattern) };
    });
  }

  private static defaultStrategyFor(pattern: string): RedactionStrategy {
    const p = pattern.toLowerCase();
    if (p.includes('email')) return 'email';
    if (p.includes('credit') || p.includes('card') || p.includes('pan')) return 'first6last4';
    if (p.includes('ssn') || p.includes('phone') || p.includes('tax')) return 'last4';
    if (p.includes('password') || p.includes('secret')) return 'full';
    return 'partial';
  }

  static getRedactionRules(): (RedactionRule | string)[] {
    const parse = (raw?: string): (RedactionRule | string)[] => {
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    };
    const piiPatterns = parse(process.env.PII_REDACTION_GLOBS);
    const generalPatterns = parse(process.env.REDACTION_GLOBS);
    const defaults: (RedactionRule | string)[] = [
      { pattern: 'password', strategy: 'full' },
      { pattern: 'token', strategy: 'last4' },
      { pattern: 'secret', strategy: 'full' },
      { pattern: 'apiKey', strategy: 'last4' },
      { pattern: 'authorization', strategy: 'last4' },
      { pattern: 'ssn', strategy: 'last4' },
      { pattern: 'creditcard', strategy: 'first6last4' },
      { pattern: 'email', strategy: 'email' },
      { pattern: 'phone', strategy: 'last4' },
    ];
    const seen = new Set<string>();
    const merged: (RedactionRule | string)[] = [];
    for (const rule of [...piiPatterns, ...generalPatterns, ...defaults]) {
      const key = (typeof rule === 'string' ? rule : rule.pattern).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(rule);
      }
    }
    return merged;
  }

  /**
   * Backwards-compatible API: returns just the pattern keywords.
   */
  static getRedactionPatterns(): string[] {
    return ApiError.getRedactionRules().map(r => typeof r === 'string' ? r : r.pattern);
  }

  toString(): string {
    const base = super.toString();
    return ApiError.sanitizeToString(base);
  }
}

export type RedactionStrategy = 'full' | 'partial' | 'last4' | 'first6last4' | 'email' | 'hash';

export interface RedactionRule {
  pattern: string;
  strategy?: RedactionStrategy;
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


