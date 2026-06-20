/**
 * UserLookupStep - Looks up a Reactory user by email, id, or username
 *
 * Config shape (from YAML `inputs` JSON):
 *   email:    "user@example.com"   (optional — look up by email address)
 *   id:       "user-id-123"        (optional — look up by user ID)
 *   username: "jdoe"               (optional — look up by username)
 *
 * At least one of email, id, or username must be provided.
 *
 * Output: { user: { id, firstName, lastName, email, displayName } }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/**
 * Configuration interface for UserLookupStep
 */
export interface UserLookupStepConfig {
  /** Look up by email address */
  email?: string;

  /** Look up by user ID */
  id?: string;

  /** Look up by username */
  username?: string;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for looking up a user within a YAML workflow
 */
export class UserLookupStep extends BaseYamlStep {
  public readonly stepType = 'user_lookup';

  /**
   * Execute the user lookup step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as UserLookupStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot look up user',
        outputs: {},
        metadata: {},
      };
    }

    const resolvedEmail = config.email
      ? this.resolveTemplate(config.email, context)
      : undefined;
    const resolvedId = config.id
      ? this.resolveTemplate(config.id, context)
      : undefined;
    const resolvedUsername = config.username
      ? this.resolveTemplate(config.username, context)
      : undefined;

    const lookupField = resolvedId ? 'id' : resolvedEmail ? 'email' : 'username';
    const lookupValue = resolvedId || resolvedEmail || resolvedUsername;

    context.logger.info(`Looking up user by ${lookupField}: ${lookupValue}`);

    try {
      const userService = this.getUserService(context);

      if (!userService) {
        return {
          success: false,
          error: 'User service not available in the Reactory context',
          outputs: {},
          metadata: { lookupField, lookupValue },
        };
      }

      let user: any = null;

      // Try different lookup methods based on available fields
      if (resolvedId) {
        if (typeof userService.getUserById === 'function') {
          user = await userService.getUserById(resolvedId);
        } else if (typeof userService.findById === 'function') {
          user = await userService.findById(resolvedId);
        } else if (typeof userService.getUser === 'function') {
          user = await userService.getUser({ id: resolvedId });
        }
      } else if (resolvedEmail) {
        if (typeof userService.getUserByEmail === 'function') {
          user = await userService.getUserByEmail(resolvedEmail);
        } else if (typeof userService.findByEmail === 'function') {
          user = await userService.findByEmail(resolvedEmail);
        } else if (typeof userService.getUser === 'function') {
          user = await userService.getUser({ email: resolvedEmail });
        }
      } else if (resolvedUsername) {
        if (typeof userService.getUserByUsername === 'function') {
          user = await userService.getUserByUsername(resolvedUsername);
        } else if (typeof userService.findByUsername === 'function') {
          user = await userService.findByUsername(resolvedUsername);
        } else if (typeof userService.getUser === 'function') {
          user = await userService.getUser({ username: resolvedUsername });
        }
      }

      if (!user) {
        context.logger.warn(`User not found for ${lookupField}: ${lookupValue}`);
        return {
          success: true,
          outputs: { user: null },
          metadata: {
            lookupField,
            lookupValue,
            found: false,
          },
        };
      }

      // Normalize user data into a safe output format
      const normalizedUser = {
        id: user._id?.toString() || user.id || null,
        firstName: user.firstName || user.first_name || null,
        lastName: user.lastName || user.last_name || null,
        email: user.email || null,
        displayName:
          user.displayName ||
          user.display_name ||
          [user.firstName || user.first_name, user.lastName || user.last_name]
            .filter(Boolean)
            .join(' ') ||
          user.email ||
          null,
      };

      context.logger.info(`User found: ${normalizedUser.displayName} (${normalizedUser.email})`);

      return {
        success: true,
        outputs: { user: normalizedUser },
        metadata: {
          lookupField,
          lookupValue,
          found: true,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`User lookup failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: { user: null },
        metadata: { lookupField, lookupValue },
      };
    }
  }

  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasEmail = config.email && typeof config.email === 'string';
    const hasId = config.id && typeof config.id === 'string';
    const hasUsername = config.username && typeof config.username === 'string';

    if (!hasEmail && !hasId && !hasUsername) {
      errors.push('At least one of email, id, or username must be provided');
    }

    if (config.email && typeof config.email !== 'string') {
      errors.push('email must be a string');
    }

    if (config.id && typeof config.id !== 'string') {
      errors.push('id must be a string');
    }

    if (config.username && typeof config.username !== 'string') {
      errors.push('username must be a string');
    }

    // Warn if multiple lookup fields are provided
    const fieldCount = [hasEmail, hasId, hasUsername].filter(Boolean).length;
    if (fieldCount > 1) {
      warnings.push(
        'Multiple lookup fields provided — priority order is: id, email, username. Only the highest-priority field will be used.',
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Resolve the user service from the Reactory context
   * @param context - Execution context
   * @returns User service or null
   */
  private getUserService(context: StepExecutionContext): any {
    try {
      const svc = context.reactoryContext.getService(
        'core.UserService@1.0.0',
      ) as any;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    try {
      const svc = context.reactoryContext.getService(
        'core.ReactoryUserService@1.0.0',
      ) as any;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    return null;
  }
}
