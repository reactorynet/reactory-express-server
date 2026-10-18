import Reactory from "@reactorynet/reactory-core";

/**
 * Singleton services are constructed once — normally during startup with the
 * *system* context — and then cached process-wide. Returning that cached object
 * as-is to every later caller means a service that reads `this.context.user` or
 * `this.context.partner` at call time keeps operating as the system user /
 * `reactory` partner instead of the calling user / tenant. That is an identity
 * attribution defect: audit fields (`createdBy`, `updatedBy`, `owner`,
 * `actorId`) and tenant-scoped queries are silently attributed to the wrong
 * actor.
 *
 * `getContextBoundInstance` wraps a shared singleton in a per-caller facade.
 * The facade is a Proxy whose `context` property resolves to the calling
 * context and whose methods run with the facade as `this`, so every read of
 * `this.context` inside the service — including reads that happen after an
 * `await` — observes the caller's context. Every other property read/write is
 * forwarded to the underlying singleton, so process-wide state (connections,
 * caches, counters) remains shared exactly as before.
 *
 * Why a facade instead of assigning `instance.context = context` on the cached
 * singleton (the ticket's Option B): the singleton is shared between interleaved
 * requests, so mutating its context re-introduces a race — after an `await` a
 * call can observe another request's context. A facade per (instance, context)
 * pair involves no shared mutable state, so interleaved async calls cannot leak
 * context into each other.
 *
 * Services that legitimately need the system identity at boot (Redis, config,
 * model registry, …) are unaffected: they are constructed with the system
 * context and, when resolved by a request, simply see the caller's context if
 * they choose to read `this.context` at call time.
 */

type ServiceContext = Reactory.Server.IReactoryContext;

/**
 * Every object that has been exposed as a context-bound singleton. Used to
 * recognise singleton *dependencies* held on a service instance so they can be
 * rebound to the current caller when accessed through a facade.
 */
const singletonInstances = new WeakSet<object>();

/** facade -> the shared singleton it forwards to. */
const facadeTargets = new WeakMap<object, object>();

/** instance -> (caller context -> facade) */
const facades = new WeakMap<object, WeakMap<object, object>>();

function isObjectLike(value: unknown): value is object {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function")
  );
}

/**
 * Returns a facade over `instance` that reads and reports `context` for the
 * duration of the caller's usage, while forwarding all other state to the
 * shared singleton.
 *
 * The same (instance, context) pair yields the same facade object, so
 * `getService(...)` remains referentially stable for a caller (existing
 * singleton semantics) without leaking that facade to other callers. Passing a
 * facade back in (e.g. a dependency that was stored as a facade) resolves to
 * the same underlying singleton, so facades are never nested.
 */
export function getContextBoundInstance<T extends object>(
  instance: T,
  context: ServiceContext
): T {
  if (!isObjectLike(instance) || context === null || context === undefined) {
    return instance;
  }

  // Unwrap a facade so we always cache against, and proxy, the singleton.
  const target = (facadeTargets.get(instance) || instance) as T;
  singletonInstances.add(target);

  let contextFacades = facades.get(target);
  if (!contextFacades) {
    contextFacades = new WeakMap<object, object>();
    facades.set(target, contextFacades);
  }

  const contextKey = context as unknown as object;
  const existing = contextFacades.get(contextKey);
  if (existing) return existing as T;

  // Mutable per-caller binding. A service that calls setExecutionContext (or
  // writes this.context) must not mutate the shared singleton, otherwise we
  // would reintroduce the cross-request race we are fixing.
  let boundContext: ServiceContext = context;

  /** Cached wrappers so `facade.method === facade.method`. */
  const methodWrappers = new Map<PropertyKey, (...args: unknown[]) => unknown>();

  const facade = new Proxy(target, {
    get(target, property, receiver) {
      if (property === "context") {
        return boundContext;
      }

      // Look the value up on the target, but resolve getters against the
      // facade so `get foo() { return this.context... }` sees the caller too.
      const value = Reflect.get(target, property, receiver);

      if (typeof value === "function") {
        let wrapper = methodWrappers.get(property);
        if (!wrapper) {
          wrapper = (...args: unknown[]) => {
            // Re-read the property at call time so late-bound/replaced methods
            // (and prototype methods) are always current.
            const current = Reflect.get(target, property, receiver) as (...callArgs: unknown[]) => unknown;
            return Reflect.apply(current, receiver, args);
          };
          methodWrappers.set(property, wrapper);
        }
        return wrapper;
      }

      if (
        isObjectLike(value) &&
        (singletonInstances.has(value) || facadeTargets.has(value))
      ) {
        // A singleton dependency: rebind it to this caller, otherwise identity
        // would stop at the first hop (e.g. OrganizationService -> KYC service)
        // and the dependency would keep using its construction context.
        return getContextBoundInstance(value, boundContext);
      }

      return value;
    },

    set(target, property, value) {
      if (property === "context") {
        // Scope the override to this caller's facade only.
        boundContext = value as ServiceContext;
        return true;
      }

      // Writes stay on the shared instance: singleton state is process-wide.
      return Reflect.set(target, property, value, target);
    },
  });

  facadeTargets.set(facade as unknown as object, target);
  contextFacades.set(contextKey, facade as unknown as object);
  return facade;
}

/**
 * True when the supplied object has been exposed as a context-bound singleton.
 * Exposed for diagnostics/tests.
 */
export function isContextBoundSingleton(value: unknown): boolean {
  return isObjectLike(value) && singletonInstances.has(value);
}

/**
 * Returns the shared singleton behind a facade (or the value unchanged when it
 * is not a facade).
 *
 * Used when handing a dependency to a service: the shared instance must hold
 * the singleton itself, never one caller's facade. Reads through a facade
 * rebind dependencies to the current caller, so identity is not lost.
 */
export function unwrapContextBoundInstance<T>(value: T): T {
  if (!isObjectLike(value)) return value;
  const target = facadeTargets.get(value);
  return (target || value) as T;
}
