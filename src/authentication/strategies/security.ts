/**
 * Security Utilities for Authentication Strategies
 * 
 * Provides shared security functions for state management, error handling,
 * and security validations across all authentication strategies.
 */

import logger from '@reactory/server-core/logging';
import { v4 as uuid } from 'uuid';
import moment from 'moment';

/**
 * State Management for OAuth Flows
 * Provides CSRF protection via state parameter
 */
export class StateManager {
  private static readonly STATE_TIMEOUT_MINUTES = 10;
  private static stateStore: Map<string, { data: any; expires: number }> = new Map();

  /**
   * Create a secure state token with embedded data
   * @param data Data to embed in state (client key, flow type, etc.)
   * @returns Base64 encoded state token
   */
  static createState(data: Record<string, any>): string {
    const stateId = uuid();
    const expires = moment().add(this.STATE_TIMEOUT_MINUTES, 'minutes').valueOf();
    
    const stateData = {
      id: stateId,
      data,
      created: Date.now(),
      expires,
    };

    // Store state for validation
    this.stateStore.set(stateId, {
      data: stateData,
      expires,
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    // Return base64 encoded state
    return Buffer.from(JSON.stringify(stateData)).toString('base64');
  }

  /**
   * Validate and decode a state token
   * @param encodedState Base64 encoded state token
   * @returns Decoded state data or null if invalid
   */
  static validateState(encodedState: string): Record<string, any> | null {
    try {
      // Decode state
      const decoded = Buffer.from(encodedState, 'base64').toString('utf-8');
      const stateData = JSON.parse(decoded);

      // Validate structure
      if (!stateData.id || !stateData.data || !stateData.expires) {
        logger.warn('Invalid state structure', { stateData });
        return null;
      }

      // Check if state exists in store
      const storedState = this.stateStore.get(stateData.id);
      if (!storedState) {
        logger.warn('State not found in store', { stateId: stateData.id });
        return null;
      }

      // Check expiration
      if (moment().isAfter(moment(stateData.expires))) {
        logger.warn('State expired', { stateId: stateData.id, expires: stateData.expires });
        this.stateStore.delete(stateData.id);
        return null;
      }

      // Valid state - remove from store (one-time use)
      this.stateStore.delete(stateData.id);

      logger.debug('State validated successfully', { stateId: stateData.id });
      return stateData.data;
    } catch (error) {
      logger.error('State validation failed', { error, encodedState });
      return null;
    }
  }

  /**
   * Clean up expired states from memory
   */
  private static cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.stateStore.forEach((value, key) => {
      if (now > value.expires) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.stateStore.delete(key);
      logger.debug('Cleaned up expired state', { stateId: key });
    });

    if (expiredKeys.length > 0) {
      logger.info(`Cleaned up ${expiredKeys.length} expired states`);
    }
  }

  /**
   * Clear all states (for testing or maintenance)
   */
  static clearAll(): void {
    this.stateStore.clear();
    logger.info('Cleared all authentication states');
  }

  /**
   * Get store statistics (for monitoring)
   */
  static getStats(): { total: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    this.stateStore.forEach(value => {
      if (now > value.expires) {
        expired++;
      }
    });

    return {
      total: this.stateStore.size,
      expired,
    };
  }
}

/**
 * Error Sanitizer
 * Ensures authentication errors don't leak sensitive information
 */
export class ErrorSanitizer {
  /**
   * Sanitize error for client response
   * @param error Original error
   * @param context Additional context (for logging only)
   * @returns Sanitized error message safe for client
   */
  static sanitizeError(error: any, context?: Record<string, any>): string {
    // Log full error server-side
    logger.error('Authentication error', { error, context });

    // Return generic message to client
    if (error?.message) {
      // Check for known safe messages
      const safeMessages = [
        'Invalid credentials',
        'Incorrect Credentials Supplied',
        'User not found',
        'Authentication failed',
        'Invalid state',
        'Token expired',
      ];

      for (const safeMsg of safeMessages) {
        if (error.message.includes(safeMsg)) {
          return safeMsg;
        }
      }
    }

    // Default generic message
    return 'Authentication failed';
  }

  /**
   * Create safe error response object
   * @param message Error message
   * @param statusCode HTTP status code
   * @returns Error response object
   */
  static createErrorResponse(message: string, statusCode: number = 401): {
    error: string;
    statusCode: number;
    timestamp: string;
  } {
    return {
      error: message,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * JWT Secret Validator
 * Validates JWT secret is properly configured
 */
export class JWTValidator {
  private static readonly DEFAULT_SECRETS = [
    'secret-key-needs-to-be-set',
    'secret',
    'your-secret-key',
    'change-me',
  ];

  /**
   * Validate JWT secret is secure
   * @param secret JWT secret to validate
   * @returns true if valid, false if insecure
   */
  static validateSecret(secret: string | undefined): boolean {
    if (!secret) {
      logger.error('JWT secret is not set!');
      return false;
    }

    // Check if using default/weak secret
    const lowerSecret = secret.toLowerCase();
    for (const defaultSecret of this.DEFAULT_SECRETS) {
      if (lowerSecret === defaultSecret.toLowerCase()) {
        logger.error('JWT secret is using default/weak value!', { secret: '***' });
        return false;
      }
    }

    // Check minimum length
    if (secret.length < 32) {
      logger.warn('JWT secret is shorter than recommended minimum (32 characters)', {
        length: secret.length,
      });
      return false;
    }

    logger.debug('JWT secret validation passed');
    return true;
  }

  /**
   * Validate JWT secret at application startup
   * Throws error if secret is invalid
   */
  static validateAtStartup(): void {
    const secret = process.env.SECRET_SAUCE;
    
    if (!this.validateSecret(secret)) {
      throw new Error(
        'SECURITY ERROR: JWT secret (SECRET_SAUCE) is not properly configured. ' +
        'Please set a strong, randomly generated secret. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }

    logger.info('JWT secret configuration validated successfully');
  }

  /**
   * Validate with warning instead of error (for development)
   */
  static validateWithWarning(): boolean {
    const secret = process.env.SECRET_SAUCE;
    const isValid = this.validateSecret(secret);

    if (!isValid) {
      logger.warn(
        'JWT secret validation failed. Application may continue but authentication is INSECURE. ' +
        'Set SECRET_SAUCE environment variable to a strong value.'
      );
    }

    return isValid;
  }
}

/**
 * Session Security Helper
 * Provides session security utilities
 */
export class SessionSecurity {
  /**
   * Create secure session configuration
   * @param isProduction Whether in production environment
   * @returns Session configuration object
   */
  static getSecureSessionConfig(isProduction: boolean = process.env.NODE_ENV === 'production') {
    return {
      secret: process.env.SESSION_SECRET || process.env.SECRET_SAUCE || 'change-me-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction, // Require HTTPS in production
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' as const, // CSRF protection
      },
    };
  }

  /**
   * Clear sensitive data from session
   * @param session Express session object
   */
  static clearSensitiveData(session: any): void {
    const sensitiveKeys = ['authState', 'oauthState', 'tempToken', 'tempData'];
    
    sensitiveKeys.forEach(key => {
      if (session[key]) {
        delete session[key];
      }
    });
  }

  /**
   * Validate session is not expired
   * @param session Express session object
   * @returns true if session is valid
   */
  static isSessionValid(session: any): boolean {
    if (!session || !session.cookie) {
      return false;
    }

    const expires = session.cookie.expires;
    if (!expires) {
      return true; // No expiration set
    }

    return moment().isBefore(moment(expires));
  }
}

/**
 * Rate Limiting Helper
 * Provides utilities for rate limiting authentication attempts
 */
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetAt: number }> = new Map();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MINUTES = 15;

  /**
   * Check if request should be rate limited
   * @param identifier Unique identifier (IP, email, etc.)
   * @returns true if should be blocked
   */
  static shouldBlock(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      // First attempt
      this.attempts.set(identifier, {
        count: 1,
        resetAt: moment().add(this.WINDOW_MINUTES, 'minutes').valueOf(),
      });
      return false;
    }

    // Check if window expired
    if (now > record.resetAt) {
      // Reset counter
      this.attempts.set(identifier, {
        count: 1,
        resetAt: moment().add(this.WINDOW_MINUTES, 'minutes').valueOf(),
      });
      return false;
    }

    // Increment counter
    record.count++;

    // Check if limit exceeded
    if (record.count > this.MAX_ATTEMPTS) {
      logger.warn('Rate limit exceeded', {
        identifier: identifier.substring(0, 10) + '***', // Partially hide identifier
        attempts: record.count,
        resetAt: new Date(record.resetAt).toISOString(),
      });
      return true;
    }

    return false;
  }

  /**
   * Reset rate limit for identifier
   * @param identifier Unique identifier
   */
  static reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  static clearAll(): void {
    this.attempts.clear();
  }

  /**
   * Clean up expired records
   */
  static cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.attempts.forEach((value, key) => {
      if (now > value.resetAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.attempts.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit records`);
    }
  }
}

/**
 * Input Validator
 * Validates user inputs for security
 */
export class InputValidator {
  /**
   * Validate email format
   * @param email Email to validate
   * @returns true if valid email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param password Password to validate
   * @returns Object with isValid flag and reason
   */
  static validatePassword(password: string): { isValid: boolean; reason?: string } {
    if (!password || password.length < 8) {
      return { isValid: false, reason: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { isValid: false, reason: 'Password is too long' };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return { isValid: false, reason: 'Password must contain at least one number' };
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      return { isValid: false, reason: 'Password must contain at least one letter' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize string input
   * @param input String to sanitize
   * @returns Sanitized string
   */
  static sanitizeString(input: string): string {
    // Remove potential script tags and dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }
}

/**
 * Audit Logger
 * Logs security-relevant authentication events
 */
export class AuthAuditLogger {
  /**
   * Log successful authentication
   * @param userId User ID
   * @param method Authentication method
   * @param metadata Additional metadata
   */
  static logSuccess(userId: string, method: string, metadata?: Record<string, any>): void {
    logger.info('Authentication successful', {
      event: 'auth.success',
      userId,
      method,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log failed authentication
   * @param identifier User identifier (email, username, etc.)
   * @param method Authentication method
   * @param reason Failure reason
   * @param metadata Additional metadata
   */
  static logFailure(
    identifier: string,
    method: string,
    reason: string,
    metadata?: Record<string, any>
  ): void {
    logger.warn('Authentication failed', {
      event: 'auth.failure',
      identifier: identifier.substring(0, 5) + '***', // Partially hide
      method,
      reason,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log security event
   * @param event Event name
   * @param severity Severity level
   * @param details Event details
   */
  static logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ): void {
    const logFunc = severity === 'critical' || severity === 'high' ? logger.error : logger.warn;

    logFunc('Security event', {
      event: `auth.security.${event}`,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

/**
 * Export all security utilities
 */
export default {
  StateManager,
  ErrorSanitizer,
  JWTValidator,
  SessionSecurity,
  RateLimiter,
  InputValidator,
  AuthAuditLogger,
};

