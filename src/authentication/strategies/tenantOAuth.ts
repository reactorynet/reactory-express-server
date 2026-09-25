/**
 * Shared start/callback plumbing for tenant-scoped OAuth providers.
 *
 * Every provider route follows the same shape:
 *
 *   start:    resolve tenant -> gate on auth_config[].enabled -> resolve the
 *             tenant's passport strategy -> mint a CSRF state bound to the
 *             session -> passport.authenticate(strategyName, { state })
 *
 *   callback: compare the returned state with the session copy -> consume it
 *             (one-time) -> resolve the tenant named inside the state ->
 *             passport.authenticate(strategyName)
 *
 * The OAuth routes sit on the tenant middleware bypass list
 * (`middleware/ReactoryClient.ts`): an IdP redirect carries no tenant
 * credential, so the tenant is taken from the validated, server-issued state
 * instead. Only the tenant *key* travels through the browser; no secret does.
 */

import { Response } from 'express';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager } from './security';
import TenantStrategyRegistry from './TenantStrategyRegistry';

export interface TenantOAuthStart {
  partner: Reactory.Models.IReactoryClientDocument;
  clientKey: string;
  strategyName: string;
  state: string;
}

export interface TenantOAuthCallback {
  partner: Reactory.Models.IReactoryClientDocument;
  clientKey: string;
  strategyName: string;
  stateData: Record<string, any>;
}

export type TenantOAuthFailure = { error: string; status: number };

const PROVIDER_LABELS: Record<string, string> = {
  okta: 'Okta',
  microsoft: 'Microsoft',
  google: 'Google',
  github: 'GitHub',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

export const providerLabel = (provider: string): string => PROVIDER_LABELS[provider] || provider;

/**
 * The tenant key for a start request: route param first, then the
 * `x-client-key` query parameter the login buttons send.
 */
export const startClientKey = (req: any): string | undefined => {
  const fromParams = req.params?.clientKey;
  const fromQuery = req.query?.['x-client-key'];
  const key = fromParams || fromQuery;
  return typeof key === 'string' && key.length > 0 ? key : undefined;
};

const setPartner = (req: any, partner: Reactory.Models.IReactoryClientDocument) => {
  req.partner = partner;
  if (!req.context) req.context = {};
  req.context.partner = partner;
};

const loadPartner = async (clientKey: string) =>
  (await ReactoryClient.findOne({ key: clientKey }).exec()) as Reactory.Models.IReactoryClientDocument | null;

/**
 * Prepare an OAuth start request. Writes the error response itself and
 * returns `null` when the flow must not continue.
 */
export const beginTenantOAuth = async (
  req: any,
  res: Response,
  provider: string,
): Promise<TenantOAuthStart | null> => {
  const label = providerLabel(provider);
  const clientKey = startClientKey(req);
  if (!clientKey) {
    res.status(400).send({ error: 'Missing client key' });
    return null;
  }

  const partner = await loadPartner(clientKey);
  if (!partner) {
    logger.error('Client not found', { clientKey, provider });
    res.status(404).send({ error: 'Client not found' });
    return null;
  }

  setPartner(req, partner);

  if (!TenantStrategyRegistry.isProviderEnabled(provider, partner)) {
    logger.warn(`${label} authentication disabled for client: ${clientKey}`);
    res.status(404).send({ error: `${label} authentication is disabled for this tenant` });
    return null;
  }

  const strategyName = TenantStrategyRegistry.getStrategyName(provider, partner);
  if (!strategyName) {
    res.status(503).send({ error: `${label} authentication is not configured correctly for this tenant` });
    return null;
  }

  const state = StateManager.createState({
    'x-client-key': clientKey,
    partnerId: partner._id?.toString(),
    flow: provider,
  });

  if (req.session) {
    req.session.authState = state;
  }

  return { partner, clientKey, strategyName, state };
};

/**
 * Validate an OAuth callback's state and resolve the tenant it names.
 *
 * The state must equal the copy stored in this browser's session at start
 * (binds the callback to the browser that began the flow, which blocks login
 * CSRF) and must still be live in the StateManager store (one-time use,
 * 10 minute expiry).
 */
export const completeTenantOAuth = async (
  req: any,
  provider: string,
): Promise<TenantOAuthCallback | TenantOAuthFailure> => {
  const returned = (req.query?.state ?? req.body?.state) as string | undefined;
  if (!returned) {
    logger.warn(`Missing state parameter in ${provider} callback`);
    return { error: 'missing_state', status: 400 };
  }

  const expected = req.session?.authState;
  if (!expected || expected !== returned) {
    logger.warn(`State parameter does not match session in ${provider} callback`);
    return { error: 'state_mismatch', status: 403 };
  }
  delete req.session.authState;

  const stateData = StateManager.validateState(returned);
  if (!stateData || !stateData['x-client-key'] || stateData.flow !== provider) {
    logger.warn(`Invalid or expired state in ${provider} callback`);
    return { error: 'invalid_state', status: 403 };
  }

  // Read by VerifiedStateStore for strategies that re-check state.
  req.verifiedOAuthState = returned;

  const clientKey = stateData['x-client-key'];
  const partner = await loadPartner(clientKey);
  if (!partner) {
    logger.error('Client not found in callback', { clientKey, provider });
    return { error: 'client_not_found', status: 404 };
  }

  setPartner(req, partner);

  if (!TenantStrategyRegistry.isProviderEnabled(provider, partner)) {
    return { error: 'provider_disabled', status: 404 };
  }

  const strategyName = TenantStrategyRegistry.getStrategyName(provider, partner);
  if (!strategyName) {
    return { error: 'provider_misconfigured', status: 503 };
  }

  return { partner, clientKey, strategyName, stateData };
};

export const isCallbackFailure = (
  result: TenantOAuthCallback | TenantOAuthFailure,
): result is TenantOAuthFailure => (result as TenantOAuthFailure).error !== undefined;
