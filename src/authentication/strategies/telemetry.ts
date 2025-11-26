/**
 * Authentication Telemetry Module
 * 
 * Provides OpenTelemetry metrics for authentication flows across all strategies.
 * Integrates with the existing reactory-telemetry module.
 * 
 * Metrics exported:
 * - auth_attempts_total: Counter for authentication attempts
 * - auth_success_total: Counter for successful authentications
 * - auth_failure_total: Counter for failed authentications
 * - auth_duration_seconds: Histogram for authentication duration
 * - auth_active_sessions: Gauge for active authenticated sessions
 * - auth_oauth_callbacks_total: Counter for OAuth callbacks received
 * - auth_csrf_validations_total: Counter for CSRF validations
 * - auth_jwt_tokens_generated_total: Counter for JWT tokens created
 * - auth_user_creation_total: Counter for new user registrations via auth
 */

import meter from '@reactory/server-modules/reactory-telemetry/prometheus/meter';
import logger from '@reactory/server-core/logging';

/**
 * Authentication Telemetry Metrics
 * Tracks authentication attempts, successes, failures, and latency
 */
export class AuthTelemetry {
  // Counters
  private static authAttemptCounter = meter.createCounter('auth_attempts_total', {
    description: 'Total number of authentication attempts',
  });

  private static authSuccessCounter = meter.createCounter('auth_success_total', {
    description: 'Total number of successful authentications',
  });

  private static authFailureCounter = meter.createCounter('auth_failure_total', {
    description: 'Total number of failed authentications',
  });

  private static userCreationCounter = meter.createCounter('auth_user_creation_total', {
    description: 'Total number of users created via authentication',
  });

  // Histogram for latency
  private static authLatencyHistogram = meter.createHistogram('auth_duration_seconds', {
    description: 'Authentication request duration in seconds',
    unit: 'seconds',
  });

  // Gauge for active sessions
  private static activeSessionsGauge = meter.createUpDownCounter('auth_active_sessions', {
    description: 'Number of currently active authenticated sessions',
  });

  // OAuth-specific counters
  private static oauthCallbackCounter = meter.createCounter('auth_oauth_callbacks_total', {
    description: 'Total OAuth callbacks received',
  });

  private static csrfValidationCounter = meter.createCounter('auth_csrf_validations_total', {
    description: 'Total CSRF validations performed',
  });

  // JWT token counter
  private static jwtTokenCounter = meter.createCounter('auth_jwt_tokens_generated_total', {
    description: 'Total JWT tokens generated',
  });

  /**
   * Record authentication attempt
   * @param provider - Authentication provider (google, facebook, local, etc.)
   * @param clientKey - Client/partner key
   */
  static recordAttempt(provider: string, clientKey: string = 'unknown'): void {
    try {
      this.authAttemptCounter.add(1, {
        provider,
        client: clientKey,
      });
      
      logger.debug('Telemetry: Authentication attempt recorded', {
        provider,
        clientKey,
      });
    } catch (error) {
      logger.error('Failed to record auth attempt metric', { error, provider, clientKey });
    }
  }

  /**
   * Record successful authentication
   * @param provider - Authentication provider
   * @param clientKey - Client/partner key
   * @param duration - Time taken in seconds
   * @param userId - User ID (optional, truncated for privacy)
   */
  static recordSuccess(
    provider: string, 
    clientKey: string = 'unknown', 
    duration: number,
    userId?: string
  ): void {
    try {
      const attributes = {
        provider,
        client: clientKey,
        user_id: userId ? userId.substring(0, 8) : 'unknown', // Truncate for privacy
      };

      this.authSuccessCounter.add(1, attributes);

      this.authLatencyHistogram.record(duration, {
        provider,
        client: clientKey,
        result: 'success',
      });

      this.activeSessionsGauge.add(1, {
        provider,
      });

      logger.debug('Telemetry: Authentication success recorded', {
        provider,
        clientKey,
        duration,
      });
    } catch (error) {
      logger.error('Failed to record auth success metric', { error, provider, clientKey });
    }
  }

  /**
   * Record failed authentication
   * @param provider - Authentication provider
   * @param clientKey - Client/partner key
   * @param reason - Failure reason
   * @param duration - Time taken in seconds
   */
  static recordFailure(
    provider: string, 
    clientKey: string = 'unknown', 
    reason: string,
    duration: number
  ): void {
    try {
      this.authFailureCounter.add(1, {
        provider,
        client: clientKey,
        reason,
      });

      this.authLatencyHistogram.record(duration, {
        provider,
        client: clientKey,
        result: 'failure',
      });

      logger.debug('Telemetry: Authentication failure recorded', {
        provider,
        clientKey,
        reason,
        duration,
      });
    } catch (error) {
      logger.error('Failed to record auth failure metric', { error, provider, clientKey });
    }
  }

  /**
   * Record session end
   * @param provider - Authentication provider
   */
  static recordSessionEnd(provider: string): void {
    try {
      this.activeSessionsGauge.add(-1, {
        provider,
      });

      logger.debug('Telemetry: Session end recorded', { provider });
    } catch (error) {
      logger.error('Failed to record session end metric', { error, provider });
    }
  }

  /**
   * Record OAuth callback received
   * @param provider - OAuth provider
   * @param clientKey - Client/partner key
   * @param hasState - Whether state parameter was present
   */
  static recordOAuthCallback(
    provider: string, 
    clientKey: string = 'unknown',
    hasState: boolean = true
  ): void {
    try {
      this.oauthCallbackCounter.add(1, {
        provider,
        client: clientKey,
        has_state: hasState ? 'true' : 'false',
      });

      logger.debug('Telemetry: OAuth callback recorded', {
        provider,
        clientKey,
        hasState,
      });
    } catch (error) {
      logger.error('Failed to record OAuth callback metric', { error, provider, clientKey });
    }
  }

  /**
   * Record CSRF validation
   * @param provider - Authentication provider
   * @param valid - Whether validation passed
   * @param clientKey - Client/partner key (optional)
   */
  static recordCSRFValidation(
    provider: string, 
    valid: boolean,
    clientKey?: string
  ): void {
    try {
      this.csrfValidationCounter.add(1, {
        provider,
        result: valid ? 'valid' : 'invalid',
        client: clientKey || 'unknown',
      });

      if (!valid) {
        logger.warn('Telemetry: Invalid CSRF validation detected', {
          provider,
          clientKey,
        });
      }
    } catch (error) {
      logger.error('Failed to record CSRF validation metric', { error, provider });
    }
  }

  /**
   * Record JWT token generation
   * @param userId - User ID (truncated for privacy)
   * @param provider - Authentication provider that triggered token generation
   */
  static recordTokenGeneration(userId: string, provider: string = 'unknown'): void {
    try {
      this.jwtTokenCounter.add(1, {
        user_id: userId.substring(0, 8), // Truncate for privacy
        provider,
      });

      logger.debug('Telemetry: JWT token generation recorded', {
        userId: userId.substring(0, 8),
        provider,
      });
    } catch (error) {
      logger.error('Failed to record token generation metric', { error, userId, provider });
    }
  }

  /**
   * Record new user creation during authentication
   * @param provider - Authentication provider
   * @param clientKey - Client/partner key
   * @param email - User email (optional, for logging only)
   */
  static recordUserCreation(
    provider: string,
    clientKey: string = 'unknown',
    email?: string
  ): void {
    try {
      this.userCreationCounter.add(1, {
        provider,
        client: clientKey,
      });

      logger.info('Telemetry: User creation recorded', {
        provider,
        clientKey,
        email: email ? `${email.substring(0, 3)}***` : 'unknown', // Partially mask for privacy
      });
    } catch (error) {
      logger.error('Failed to record user creation metric', { error, provider, clientKey });
    }
  }

  /**
   * Record authentication flow with automatic timing
   * Returns an object with methods to complete the measurement
   * @param provider - Authentication provider
   * @param clientKey - Client/partner key
   */
  static startAuthFlow(provider: string, clientKey: string = 'unknown'): AuthFlowTimer {
    const startTime = Date.now();
    this.recordAttempt(provider, clientKey);

    return {
      success: (userId?: string) => {
        const duration = (Date.now() - startTime) / 1000;
        this.recordSuccess(provider, clientKey, duration, userId);
      },
      failure: (reason: string) => {
        const duration = (Date.now() - startTime) / 1000;
        this.recordFailure(provider, clientKey, reason, duration);
      },
    };
  }
}

/**
 * Authentication Flow Timer
 * Helper interface for timing authentication flows
 */
export interface AuthFlowTimer {
  success: (userId?: string) => void;
  failure: (reason: string) => void;
}

/**
 * Middleware to track HTTP request metrics for auth endpoints
 * Can be added to specific auth routes for granular tracking
 */
export const authTelemetryMiddleware = (provider: string) => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const clientKey = req.params.clientKey || req.query['x-client-key'] || 'unknown';

    // Track attempt
    AuthTelemetry.recordAttempt(provider, clientKey);

    // Override res.redirect to track completion
    const originalRedirect = res.redirect.bind(res);
    res.redirect = (url: string) => {
      const duration = (Date.now() - startTime) / 1000;
      
      // Determine success/failure based on redirect URL
      if (url.includes('failure') || url.includes('error')) {
        AuthTelemetry.recordFailure(provider, clientKey, 'redirect_failure', duration);
      }
      
      return originalRedirect(url);
    };

    next();
  };
};

/**
 * Export default instance
 */
export default AuthTelemetry;

