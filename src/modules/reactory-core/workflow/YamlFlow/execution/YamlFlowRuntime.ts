/**
 * YamlFlow runtime provider.
 *
 * When YAML workflows execute through the workflow-es durable engine, individual
 * steps run inside the engine host — potentially on resume after a process
 * restart — so they cannot capture the original request-scoped Reactory context
 * (it is non-serializable and may no longer exist). Instead, steps rebuild a
 * Reactory context at run time from serializable identity carried in the
 * workflow data, falling back to the long-lived system context.
 *
 * This module is a tiny process-level provider that the WorkflowRunner populates
 * at startup with the shared step registry and the system context. The
 * YamlStepBody adapter reads from here rather than importing the WorkflowRunner
 * (which would create an import cycle).
 */

import Reactory from '@reactorynet/reactory-core';
import { YamlStepRegistry } from '../steps/registry/YamlStepRegistry';

/**
 * Lazily resolve the Reactory context factory. Imported on demand (not at module
 * load) so the YAML bridge does not eagerly pull in the entire app module graph
 * — which is heavy and, in some load orders, not yet initialised.
 */
function getContextFactory(): (session: any, current?: any) => Promise<Reactory.Server.IReactoryContext> {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const mod = require('@reactory/server-core/context/ReactoryContextProvider');
  return mod.default || mod;
}

/** Serializable identity carried in workflow data so a context can be rebuilt. */
export interface WorkflowIdentity {
  /** User email — resolved via context.forUser(email). */
  userEmail?: string;
  /** Reactory client key (tenant) — resolved via context.forPartner(key). */
  partnerKey?: string;
}

interface YamlFlowRuntimeState {
  registry: YamlStepRegistry | null;
  systemContext: Reactory.Server.IReactoryContext | null;
}

const state: YamlFlowRuntimeState = {
  registry: null,
  systemContext: null,
};

/**
 * Cache of rehydrated contexts keyed by identity. Building a context performs
 * user/partner DB lookups and wires services, so we reuse one per identity for
 * the process lifetime. Services are process-wide singletons regardless.
 */
const contextCache = new Map<string, Promise<Reactory.Server.IReactoryContext>>();

/**
 * Called once by the WorkflowRunner during initialization to share its registry
 * and system context with the YAML step adapter.
 */
export function configureYamlFlowRuntime(opts: {
  registry: YamlStepRegistry;
  systemContext: Reactory.Server.IReactoryContext | null;
}): void {
  state.registry = opts.registry;
  state.systemContext = opts.systemContext;
}

/**
 * Get the shared step registry. Falls back to a fresh registry with core
 * defaults only (used in standalone/test scenarios where the runner has not
 * configured the runtime).
 */
export function getYamlStepRegistry(): YamlStepRegistry {
  if (!state.registry) {
    state.registry = new YamlStepRegistry();
  }
  return state.registry;
}

/** The long-lived system context, if configured. */
export function getSystemContext(): Reactory.Server.IReactoryContext | null {
  return state.systemContext;
}

function identityKey(identity?: WorkflowIdentity): string {
  return `${identity?.userEmail ?? ''}|${identity?.partnerKey ?? ''}`;
}

/**
 * Rebuild a Reactory context for a workflow step run.
 *
 * Mirrors the pattern used by the KYC/KB code workflows: create a bare context
 * then apply identity via forUser/forPartner. Results are cached per identity.
 * Falls back to the configured system context when no identity is supplied or
 * rehydration fails.
 */
export async function createWorkflowContext(
  identity?: WorkflowIdentity,
): Promise<Reactory.Server.IReactoryContext | undefined> {
  const hasIdentity = !!(identity?.userEmail || identity?.partnerKey);

  if (!hasIdentity) {
    return state.systemContext ?? undefined;
  }

  const key = identityKey(identity);
  if (contextCache.has(key)) {
    return contextCache.get(key);
  }

  const build = (async (): Promise<Reactory.Server.IReactoryContext> => {
    const contextFactory = getContextFactory();
    const ctx: any = await contextFactory(null, {});
    if (identity?.userEmail && typeof ctx.forUser === 'function') {
      await ctx.forUser(identity.userEmail);
    }
    if (identity?.partnerKey && typeof ctx.forPartner === 'function') {
      await ctx.forPartner(identity.partnerKey);
    }
    return ctx as Reactory.Server.IReactoryContext;
  })();

  contextCache.set(key, build);

  try {
    return await build;
  } catch {
    // On failure, drop the cache entry and fall back to the system context.
    contextCache.delete(key);
    return state.systemContext ?? undefined;
  }
}

/** Test/maintenance helper — clears the rehydrated-context cache. */
export function clearWorkflowContextCache(): void {
  contextCache.clear();
}
