import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';
import type { IAuditLogParams } from '@reactory/server-modules/reactory-core/services/ReactoryAuditService';

const AUDIT_SERVICE_ID = 'core.ReactoryAuditService@1.0.0';

// ─── Value extractor ─────────────────────────────────────────────────────────

/**
 * A function that extracts a value from the method args or result.
 * Supports a dot-notation shorthand string (e.g. `"0.id"` → `args[0].id`),
 * or a fully custom function for complex cases.
 */
export type ValueExtractor<T = any> =
  | string                                      // dot-path into args: "0.id", "1.name"
  | ((args: any[], result: T | undefined, instance: any) => any);

// ─── Timing options ───────────────────────────────────────────────────────────

/**
 * Controls when audit entries are written relative to method execution.
 *
 * - `'before'`  – write one entry before the method runs (captures intent / "what was about to happen")
 * - `'after'`   – write one entry after the method completes (captures outcome)
 * - `'both'`    – write two entries: one before and one after
 *
 * @default 'after'
 */
export type AuditTiming = 'before' | 'after' | 'both';

// ─── Main options type ────────────────────────────────────────────────────────

export interface AuditOptions {
  /**
   * Human-readable action name written to the audit log.
   * Supports `${n}` / `${n.prop}` template placeholders resolved from method args.
   *
   * @example 'user.login'
   * @example 'document.${0}.update'
   */
  action: string;

  /**
   * Identifies the code module/service writing the entry.
   * Supports the same placeholder syntax as `action`.
   * Defaults to the decorated class name if omitted.
   */
  source?: string;

  /**
   * CRUD / lifecycle event classification.
   */
  eventType?: IAuditLogParams['eventType'];

  /**
   * Type of resource being acted upon (e.g. `'User'`, `'Document'`).
   * Supports placeholder syntax.
   */
  resourceType?: string;

  /**
   * Extractor for the resource identifier.
   * A dot-path string is resolved against the method args for `'before'`/`'both'`,
   * and against the result for `'after'`/`'both'` (falling back to args).
   *
   * @example '0.id'          – args[0].id
   * @example '0'             – String(args[0])
   * @example (args, result) => result?.id
   */
  resourceId?: ValueExtractor;

  /**
   * Extractor for the snapshot of state **before** the operation.
   * Only used when timing includes `'before'` or `'both'`.
   * Receives `(args, undefined, instance)` because the method has not yet run.
   *
   * @example '0'             – serialises args[0] as the before-state
   * @example (args) => args[0]
   */
  before?: ValueExtractor;

  /**
   * Extractor for the snapshot of state **after** the operation.
   * Only used when timing includes `'after'` or `'both'`.
   * Receives `(args, result, instance)`.
   *
   * @example (args, result) => result
   */
  after?: ValueExtractor;

  /**
   * Additional static or dynamic metadata attached to every entry.
   * When a function, receives `(args, result | undefined, instance)`.
   */
  metadata?: Record<string, any> | ((args: any[], result: any, instance: any) => Record<string, any>);

  /**
   * Controls when the audit entry is written.
   * @default 'after'
   */
  timing?: AuditTiming;

  /**
   * Actor type override. When omitted, inferred from `context.user`:
   * - authenticated user → `'user'`
   * - anonymous / guest  → `'system'`
   */
  actorType?: IAuditLogParams['actorType'];

  /**
   * Module name written to the audit record.
   */
  moduleName?: string;

  /**
   * Module version written to the audit record.
   */
  moduleVersion?: string;

  /**
   * Where to find the Reactory context.
   * - `'instance'` – `this.context` on the class instance (default)
   * - `'params'`   – scans method arguments for an object that has `getService`
   */
  contextSource?: 'instance' | 'params';

  /**
   * When `true` a failure inside the audit service is logged but does NOT
   * propagate; the original method result / error is always returned to the caller.
   * @default true
   */
  failSilently?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveTemplate(template: string, args: any[]): string {
  return template.replace(/\$\{(\d+(?:\.[^}]+)?)\}/g, (_match, path: string) => {
    const [indexStr, ...rest] = path.split('.');
    let value = args[parseInt(indexStr, 10)];
    for (const segment of rest) {
      if (value == null) break;
      value = value[segment];
    }
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

function extractContext(
  args: any[],
  instance: any,
  source: 'instance' | 'params',
): Reactory.Server.IReactoryContext | null {
  if (source === 'instance') return instance?.context ?? null;
  for (const arg of args) {
    if (arg && typeof arg === 'object' && typeof arg.getService === 'function') {
      return arg as Reactory.Server.IReactoryContext;
    }
  }
  return null;
}

function resolveExtractor(
  extractor: ValueExtractor | undefined,
  args: any[],
  result: any,
  instance: any,
): any {
  if (extractor === undefined) return undefined;
  if (typeof extractor === 'function') return extractor(args, result, instance);
  // dot-path string: "0.id" → args[0].id
  const [indexStr, ...rest] = extractor.split('.');
  let value = args[parseInt(indexStr, 10)];
  for (const segment of rest) {
    if (value == null) break;
    value = value[segment];
  }
  return value;
}

function resolveMetadata(
  metadata: AuditOptions['metadata'],
  args: any[],
  result: any,
  instance: any,
): Record<string, any> | undefined {
  if (!metadata) return undefined;
  if (typeof metadata === 'function') return metadata(args, result, instance);
  return metadata;
}

function buildParams(
  opts: AuditOptions,
  className: string,
  args: any[],
  result: any,
  instance: any,
  context: Reactory.Server.IReactoryContext,
  phase: 'before' | 'after',
  errorMessage?: string,
): IAuditLogParams {
  const action = resolveTemplate(opts.action, args);
  const source = opts.source ? resolveTemplate(opts.source, args) : className;
  const resourceType = opts.resourceType ? resolveTemplate(opts.resourceType, args) : undefined;
  const resourceId = resolveExtractor(opts.resourceId, args, result, instance);
  const beforeVal = phase === 'before' || opts.timing === 'both'
    ? resolveExtractor(opts.before, args, undefined, instance)
    : undefined;
  const afterVal = phase === 'after'
    ? resolveExtractor(opts.after, args, result, instance)
    : undefined;
  const metadata = resolveMetadata(opts.metadata, args, result, instance);

  const user = context.user?._id?.toString();
  const actorType: IAuditLogParams['actorType'] =
    opts.actorType ?? (user && user !== 'ANON' ? 'user' : 'system');

  return {
    action,
    source,
    user,
    before: beforeVal,
    after: afterVal,
    actorType,
    actorId: user,
    resourceType,
    resourceId: resourceId != null ? String(resourceId) : undefined,
    eventType: opts.eventType,
    metadata,
    ipAddress: context.req?.ip,
    userAgent: context.req?.headers?.['user-agent'] as string | undefined,
    sessionId: context.sessionId,
    organizationId: context.partner?._id?.toString(),
    moduleName: opts.moduleName,
    moduleVersion: opts.moduleVersion,
    success: phase === 'before' ? undefined : errorMessage === undefined,
    errorMessage,
  };
}

// ─── Decorator ────────────────────────────────────────────────────────────────

/**
 * Method decorator that writes structured audit entries via `ReactoryAuditService`.
 *
 * Three timing modes:
 * - `'before'` – one entry written before the method body runs (intent capture)
 * - `'after'`  – one entry written after the method completes (outcome capture, default)
 * - `'both'`   – two entries: one before (no result), one after (with result / error)
 *
 * Value extractors for `before`, `after`, `resourceId`, and `metadata` accept:
 * - A dot-path string resolved against method args: `'0.id'` → `args[0].id`
 * - A function `(args, result, instance) => any` for full control
 *
 * The decorator is fail-open: if `ReactoryAuditService` is unavailable or the
 * audit write fails, a warning is logged but the original method result is
 * always returned (configurable via `failSilently`).
 *
 * @example
 * // Capture outcome only
 * @audit({ action: 'user.login', eventType: 'access', resourceType: 'User',
 *           resourceId: (args) => args[0],         // username
 *           after: (_, result) => ({ userId: result?._id }) })
 * async login(username: string, password: string) { … }
 *
 * @example
 * // Capture before-state and after-state for a mutation
 * @audit({ action: 'document.update', eventType: 'update', timing: 'both',
 *           resourceType: 'Document', resourceId: '0.id',
 *           before: '0',                            // args[0] = old document
 *           after:  (_, result) => result })         // resolved result
 * async updateDocument(doc: Document) { … }
 *
 * @example
 * // GraphQL resolver — context comes from params
 * @audit({ action: 'kyc.approve', eventType: 'approve', contextSource: 'params',
 *           resourceType: 'KYCRecord', resourceId: '0.id' })
 * async approveKyc(record: KycRecord, _args: any, context: IReactoryContext) { … }
 */
export function audit(options: AuditOptions) {
  const {
    timing = 'after',
    contextSource = 'instance',
    failSilently = true,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const className = target?.constructor?.name ?? 'UnknownService';
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = extractContext(args, this, contextSource);

      if (!context) {
        logger.warn(`@audit [${className}.${propertyKey}]: no Reactory context – skipping audit`);
        return originalMethod.apply(this, args);
      }

      let auditService: any;
      try {
        auditService = context.getService<any>(AUDIT_SERVICE_ID);
      } catch {
        logger.warn(`@audit [${className}.${propertyKey}]: ReactoryAuditService not available – skipping audit`);
        return originalMethod.apply(this, args);
      }

      const writeEntry = async (phase: 'before' | 'after', result?: any, errorMessage?: string) => {
        if (!auditService) return;
        try {
          const params = buildParams(options, className, args, result, this, context, phase, errorMessage);
          await auditService.logAuditEvent(params);
        } catch (err) {
          if (failSilently) {
            logger.error(`@audit [${className}.${propertyKey}]: failed to write ${phase} audit entry`, { error: err });
          } else {
            throw err;
          }
        }
      };

      // ── before entry ──────────────────────────────────────────────────────
      if (timing === 'before' || timing === 'both') {
        await writeEntry('before');
      }

      // ── method execution ──────────────────────────────────────────────────
      let result: any;
      let thrownError: Error | undefined;

      try {
        result = await originalMethod.apply(this, args);
      } catch (err) {
        thrownError = err as Error;
      }

      // ── after entry ───────────────────────────────────────────────────────
      if (timing === 'after' || timing === 'both') {
        await writeEntry('after', result, thrownError?.message);
      }

      if (thrownError) throw thrownError;
      return result;
    };

    return descriptor;
  };
}
