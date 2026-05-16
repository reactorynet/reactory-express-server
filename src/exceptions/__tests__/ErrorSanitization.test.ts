import ApiError from '../index';
import { InputValidator } from '../../authentication/strategies/security';

describe('ApiError - maskValue strategies', () => {
  describe('partial strategy', () => {
    it('shows first and last char for medium values', () => {
      expect(ApiError.maskValue('mySecretValue', 'partial')).toBe('m***********e');
    });

    it('masks fully for very short values', () => {
      expect(ApiError.maskValue('ab', 'partial')).toBe('**');
      expect(ApiError.maskValue('a', 'partial')).toBe('*');
    });

    it('shows only first char for short values', () => {
      expect(ApiError.maskValue('abcd', 'partial')).toBe('a***');
    });

    it('handles empty string', () => {
      expect(ApiError.maskValue('', 'partial')).toBe('');
    });
  });

  describe('last4 strategy (PCI-DSS / SSN compliant)', () => {
    it('shows only last 4 digits', () => {
      expect(ApiError.maskValue('4111111111111111', 'last4')).toBe('************1111');
    });

    it('masks fully when value is too short', () => {
      expect(ApiError.maskValue('123', 'last4')).toBe('***');
    });

    it('handles SSN', () => {
      expect(ApiError.maskValue('123456789', 'last4')).toBe('*****6789');
    });
  });

  describe('first6last4 strategy (PCI-DSS PAN compliant)', () => {
    it('shows BIN + last 4 for credit cards', () => {
      expect(ApiError.maskValue('4111111111111111', 'first6last4')).toBe('411111******1111');
    });

    it('falls back to last4 for short values', () => {
      expect(ApiError.maskValue('12345', 'first6last4')).toBe('*2345');
    });
  });

  describe('email strategy', () => {
    it('preserves domain TLD, masks user and domain name', () => {
      const result = ApiError.maskValue('john.doe@example.com', 'email');
      expect(result).toMatch(/^j.*e@\*+\.com$/);
    });

    it('handles short usernames', () => {
      const result = ApiError.maskValue('ab@example.com', 'email');
      expect(result).toMatch(/^\*\*@\*+\.com$/);
    });

    it('falls back to partial when no @ sign', () => {
      expect(ApiError.maskValue('notanemail', 'email')).toBe('n********l');
    });

    it('preserves dot extension only', () => {
      const result = ApiError.maskValue('test@reactory.net', 'email');
      expect(result).toContain('.net');
      expect(result).not.toContain('reactory');
    });
  });

  describe('hash strategy (HIPAA-friendly correlation)', () => {
    it('produces deterministic hash output', () => {
      const a = ApiError.maskValue('patient-id-12345', 'hash');
      const b = ApiError.maskValue('patient-id-12345', 'hash');
      expect(a).toBe(b);
      expect(a).toMatch(/^\[HASH:[a-f0-9]+\]$/);
    });

    it('different values produce different hashes', () => {
      const a = ApiError.maskValue('value1', 'hash');
      const b = ApiError.maskValue('value2', 'hash');
      expect(a).not.toBe(b);
    });
  });

  describe('full strategy', () => {
    it('returns [REDACTED] regardless of value', () => {
      expect(ApiError.maskValue('anything', 'full')).toBe('[REDACTED]');
      expect(ApiError.maskValue('a', 'full')).toBe('[REDACTED]');
    });
  });
});

describe('ApiError - sanitizeToString with value masking', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('key=value pattern detection', () => {
    it('masks password value with full strategy', () => {
      const result = ApiError.sanitizeToString('password=mySecretP4ss');
      expect(result).toContain('password=[REDACTED]');
      expect(result).not.toContain('mySecretP4ss');
    });

    it('masks token value with last4 strategy', () => {
      const result = ApiError.sanitizeToString('token=abcdef123456');
      expect(result).toContain('3456');
      expect(result).not.toContain('abcdef12');
    });

    it('masks JSON-style key:value pairs', () => {
      const input = '{"password":"secret123","user":"john"}';
      const result = ApiError.sanitizeToString(input);
      expect(result).toContain('"password":"[REDACTED]"');
      expect(result).toContain('"user":"john"');
    });

    it('masks unquoted JSON values', () => {
      const input = '"token":abc123456';
      const result = ApiError.sanitizeToString(input);
      expect(result).not.toContain('abc123');
    });

    it('masks key: value with whitespace', () => {
      const result = ApiError.sanitizeToString('password: hunter2');
      expect(result).toContain('password: [REDACTED]');
    });

    it('handles multiple key=value pairs', () => {
      const result = ApiError.sanitizeToString('password=secret&token=abc123def&user=alice');
      expect(result).toContain('[REDACTED]');
      expect(result).toContain('user=alice');
      expect(result).not.toContain('secret');
    });
  });

  describe('email value masking', () => {
    it('masks raw emails using email strategy', () => {
      const result = ApiError.sanitizeToString('User john.doe@example.com failed login');
      expect(result).not.toContain('john.doe');
      expect(result).toContain('@');
      expect(result).toContain('.com');
    });

    it('masks email when in key=value form', () => {
      const result = ApiError.sanitizeToString('email=alice@reactory.net');
      expect(result).not.toContain('alice');
    });
  });

  describe('credit card masking (PCI-DSS compliance)', () => {
    it('detects and masks raw 16-digit credit card numbers', () => {
      const result = ApiError.sanitizeToString('Charge declined for 4111111111111111');
      expect(result).toContain('411111');
      expect(result).toContain('1111');
      expect(result).not.toContain('4111111111111111');
      expect(result).toMatch(/411111\*+1111/);
    });

    it('masks credit cards with spaces', () => {
      const result = ApiError.sanitizeToString('card 4111 1111 1111 1111 expired');
      expect(result).not.toContain('4111 1111 1111 1111');
    });

    it('masks credit cards with dashes', () => {
      const result = ApiError.sanitizeToString('card 4111-1111-1111-1111');
      expect(result).not.toMatch(/4111-1111-1111-1111/);
    });

    it('does not match short numbers', () => {
      const result = ApiError.sanitizeToString('order #12345');
      expect(result).toContain('12345');
    });
  });

  describe('SSN masking (HIPAA / IRS compliance)', () => {
    it('detects and masks US SSN format', () => {
      const result = ApiError.sanitizeToString('Patient SSN: 123-45-6789');
      expect(result).not.toContain('123-45-6789');
      expect(result).toContain('6789');
    });
  });

  describe('JWT token masking', () => {
    it('detects and masks JWT-formatted tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = ApiError.sanitizeToString(`Authorization: Bearer ${jwt}`);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(result).toContain('w5c');
    });
  });

  describe('Bearer token masking', () => {
    it('masks bearer tokens', () => {
      const result = ApiError.sanitizeToString('Authorization: Bearer abc123def456ghi789');
      expect(result).toContain('Bearer');
      expect(result).not.toContain('abc123def456ghi');
    });
  });

  describe('environment variable rules', () => {
    it('accepts string array format (legacy)', () => {
      process.env.REDACTION_GLOBS = JSON.stringify(['customField']);
      const result = ApiError.sanitizeToString('customField=mySecretData');
      expect(result).not.toContain('mySecretData');
    });

    it('accepts structured RedactionRule format', () => {
      process.env.PII_REDACTION_GLOBS = JSON.stringify([
        { pattern: 'patientId', strategy: 'hash' }
      ]);
      const result = ApiError.sanitizeToString('patientId=ABC-12345');
      expect(result).toMatch(/patientId=\[HASH:[a-f0-9]+\]/);
    });

    it('infers strategy from pattern name when not specified', () => {
      process.env.REDACTION_GLOBS = JSON.stringify([
        { pattern: 'customCard' }
      ]);
      const result = ApiError.sanitizeToString('customCard=4111111111111111');
      expect(result).toMatch(/customCard=411111\*+1111/);
    });

    it('handles invalid JSON gracefully', () => {
      process.env.PII_REDACTION_GLOBS = 'not-valid-json';
      const result = ApiError.sanitizeToString('password=secret');
      expect(result).toContain('[REDACTED]');
    });

    it('deduplicates rules across env variables', () => {
      process.env.PII_REDACTION_GLOBS = JSON.stringify(['password']);
      process.env.REDACTION_GLOBS = JSON.stringify(['password']);
      const rules = ApiError.getRedactionRules();
      const passwordRules = rules.filter(r => 
        (typeof r === 'string' ? r : r.pattern).toLowerCase() === 'password'
      );
      expect(passwordRules.length).toBe(1);
    });
  });

  describe('SANITIZER_DISABLE env var', () => {
    afterEach(() => {
      delete process.env.SANITIZER_DISABLE;
    });

    it('allows disabling individual scanners', () => {
      process.env.SANITIZER_DISABLE = 'creditcard';
      const result = ApiError.sanitizeToString('Card: 4111111111111111');
      expect(result).toContain('4111111111111111');
    });

    it('allows disabling multiple scanners', () => {
      process.env.SANITIZER_DISABLE = 'creditcard,ssn,email';
      const result = ApiError.sanitizeToString('SSN 123-45-6789 user@test.com');
      expect(result).toContain('123-45-6789');
      expect(result).toContain('user@test.com');
    });
  });

  describe('toString() method integration', () => {
    it('sanitizes error message via toString', () => {
      const error = new ApiError('Login failed: password=secret123 for user@test.com');
      const result = error.toString();
      expect(result).not.toContain('secret123');
      expect(result).not.toContain('user@test.com');
    });

    it('preserves error context for debugging', () => {
      const error = new ApiError('Login failed: password=secret123');
      const result = error.toString();
      expect(result).toContain('Login failed');
      expect(result).toContain('password');
    });
  });

  describe('compliance scenarios', () => {
    it('PCI-DSS: credit card never appears in full', () => {
      const inputs = [
        'Payment with 4111111111111111 declined',
        'card=4111111111111111',
        '"card_number":"4111111111111111"',
        'card 4111 1111 1111 1111',
      ];
      for (const input of inputs) {
        const result = ApiError.sanitizeToString(input);
        expect(result).not.toContain('4111111111111111');
        expect(result).not.toContain('4111 1111 1111 1111');
      }
    });

    it('HIPAA: SSN never appears in full', () => {
      const result = ApiError.sanitizeToString('Patient ssn=123-45-6789 admitted');
      expect(result).not.toContain('123-45-6789');
    });

    it('GDPR: email is pseudonymized but domain class preserved', () => {
      const result = ApiError.sanitizeToString('GDPR breach: user@example.com');
      expect(result).not.toContain('user@example.com');
      expect(result).toContain('.com');
    });

    it('OAuth: tokens never logged in full', () => {
      const result = ApiError.sanitizeToString('access_token=ya29.a0ARrdaM-secretGoogleToken123');
      expect(result).not.toContain('ya29.a0ARrdaM-secretGoogleToken123');
    });
  });
});

describe('ApiError - getRedactionPatterns backwards compatibility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns array of pattern keys', () => {
    delete process.env.PII_REDACTION_GLOBS;
    delete process.env.REDACTION_GLOBS;
    const patterns = ApiError.getRedactionPatterns();
    expect(patterns).toContain('password');
    expect(patterns).toContain('token');
    expect(patterns).toContain('email');
  });

  it('combines patterns from env vars', () => {
    process.env.PII_REDACTION_GLOBS = JSON.stringify(['ssn', 'creditcard']);
    process.env.REDACTION_GLOBS = JSON.stringify(['email', 'phone']);
    const patterns = ApiError.getRedactionPatterns();
    expect(patterns).toContain('ssn');
    expect(patterns).toContain('creditcard');
    expect(patterns).toContain('email');
    expect(patterns).toContain('phone');
  });
});

describe('InputValidator - sanitizeString integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('removes HTML and applies redaction', () => {
    const input = '<script>alert("xss")</script>password=secret';
    const result = InputValidator.sanitizeString(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('[REDACTED]');
  });

  it('strips dangerous characters', () => {
    const input = 'email<user@example.com>';
    const result = InputValidator.sanitizeString(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});
