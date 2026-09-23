import crypto from 'crypto';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { VerifiedStateStore } from './security';

export type StrategyFactory = (properties: any, options?: any) => passport.Strategy | null;

interface CacheEntry {
  strategy: passport.Strategy;
  name: string;
  fingerprint: string;
  timestamp: number;
}

/**
 * Name each env-backed default strategy registers under with passport. This is
 * the strategy's own `name` property, because `configure.ts` registers them
 * with `passport.use(strategy)`.
 */
const DEFAULT_STRATEGY_NAMES: Record<string, string> = {
  okta: 'okta',
  microsoft: 'azuread-openidconnect',
  google: 'google',
  github: 'github',
  facebook: 'facebook',
  linkedin: 'linkedin',
};

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Result of resolving a provider for a tenant.
 *
 * - `name` is the passport strategy name to call `passport.authenticate` with.
 * - `name === null` means the tenant carries an `auth_config` entry for the
 *   provider that could not be turned into a strategy (missing credentials or
 *   an error in the factory). Callers must fail closed: silently falling back
 *   to the process-wide application would log the user in through a different
 *   tenant's identity provider.
 */
export interface TenantStrategyResolution {
  name: string | null;
  strategy: passport.Strategy | null;
  tenantScoped: boolean;
}

const fingerprintOf = (config: any): string =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify({ properties: config?.properties ?? {}, options: config?.options ?? {} }))
    .digest('hex');

class TenantStrategyRegistryClass {
  private cache: Map<string, CacheEntry> = new Map();
  private factories: Map<string, StrategyFactory> = new Map();

  constructor() {
    this.registerFactory('okta', (properties: any) => {
      const {
        clientID,
        clientSecret,
        domain,
        issuer,
        callbackURL = process.env.OKTA_CALLBACK_URL || 'http://localhost:4000/auth/okta/callback',
        audience,
      } = properties;

      if (!clientID || !clientSecret || !(domain || audience || issuer)) {
        logger.warn('Cannot instantiate tenant Okta strategy: clientID, clientSecret and domain are required');
        return null;
      }

      const { Strategy: OktaOAuthStrategy } = require('passport-okta-oauth20');
      const { oktaVerifyCallback } = require('./okta/OktaStrategy');
      const resolvedAudience = audience || (domain ? `https://${domain}` : new URL(issuer).origin);

      return new OktaOAuthStrategy({
        audience: resolvedAudience,
        clientID,
        clientSecret,
        callbackURL,
        scope: ['openid', 'profile', 'email'],
        passReqToCallback: true,
        // State is minted and verified by the tenant OAuth routes.
        store: new VerifiedStateStore(),
      }, oktaVerifyCallback);
    });

    this.registerFactory('microsoft', (properties: any) => {
      const {
        clientID,
        clientSecret,
        tenantId,
        redirectUrl = process.env.MICROSOFT_OAUTH_REDIRECT_URI || 'http://localhost:4000/auth/microsoft/openid/complete/',
      } = properties;

      if (!clientID || !clientSecret || !tenantId) {
        logger.warn('Cannot instantiate tenant Microsoft strategy: clientID, clientSecret and tenantId are required');
        return null;
      }

      const { OIDCStrategy } = require('passport-azure-ad');
      const { microsoftVerifyCallback, microsoftIssuerOptions } = require('./microsoft/MicrosoftStrategy');

      return new OIDCStrategy({
        identityMetadata: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
        clientID,
        responseType: 'code id_token',
        responseMode: 'form_post',
        redirectUrl,
        allowHttpForRedirectUrl: redirectUrl.startsWith('http://'),
        clientSecret,
        ...microsoftIssuerOptions(tenantId),
        passReqToCallback: true,
        scope: ['openid', 'profile', 'email'],
      }, microsoftVerifyCallback);
    });

    this.registerFactory('google', (properties: any) => {
      const {
        clientID,
        clientSecret,
        callbackURL = process.env.GOOLGE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback',
        scope = (process.env.GOOGLE_OAUTH_SCOPE || 'openid email profile').split(' '),
      } = properties;

      if (!clientID || !clientSecret) return null;

      const { Strategy: GoogleOAuth2Strategy } = require('passport-google-oauth20');
      const { googleVerifyCallback } = require('./google/GoogleStrategy');

      return new GoogleOAuth2Strategy({
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
        scope,
      }, googleVerifyCallback);
    });

    this.registerFactory('github', (properties: any) => {
      const {
        clientID,
        clientSecret,
        callbackURL = process.env.GITHUB_CLIENT_CALLBACK_URL || 'http://localhost:4000/auth/github/callback',
        scope = (process.env.GITHUB_OAUTH_SCOPE || 'user:email,read:user').split(','),
      } = properties;

      if (!clientID || !clientSecret) return null;

      const { Strategy: GitHubStrategy } = require('passport-github');
      const { githubVerifyCallback } = require('./github/GithubStrategy');

      return new GitHubStrategy({
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
        scope,
      }, githubVerifyCallback);
    });

    this.registerFactory('facebook', (properties: any) => {
      const {
        clientID,
        clientSecret,
        callbackURL = process.env.FACEBOOK_APP_CALLBACK_URL || 'http://localhost:4000/auth/facebook/callback',
        scope = (process.env.FACEBOOK_OAUTH_SCOPE || 'email,public_profile').split(','),
      } = properties;

      if (!clientID || !clientSecret) return null;

      const { Strategy: FacebookOAuthStrategy } = require('passport-facebook');
      const { facebookVerifyCallback } = require('./facebook/FacebookStrategy');

      return new FacebookOAuthStrategy({
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
        profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
        scope,
      }, facebookVerifyCallback);
    });

    this.registerFactory('linkedin', (properties: any) => {
      const {
        clientID,
        clientSecret,
        callbackURL = process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:4000/auth/linkedin/callback',
        scope = (process.env.LINKEDIN_OAUTH_SCOPE || 'openid,profile,email').split(','),
      } = properties;

      if (!clientID || !clientSecret) return null;

      const { Strategy: LinkedInOAuthStrategy } = require('passport-linkedin-oauth2');
      const { linkedinVerifyCallback } = require('./linkedin/LinkedInStrategy');

      return new LinkedInOAuthStrategy({
        clientID,
        clientSecret,
        callbackURL,
        scope,
        passReqToCallback: true,
      }, linkedinVerifyCallback);
    });
  }

  /**
   * Registers a strategy factory for a given OAuth/OIDC provider
   */
  public registerFactory(provider: string, factory: StrategyFactory): void {
    this.factories.set(provider.toLowerCase(), factory);
  }

  /**
   * The passport name of the env-backed default strategy for a provider.
   */
  public defaultName(providerName: string): string {
    const provider = providerName.toLowerCase();
    return DEFAULT_STRATEGY_NAMES[provider] || provider;
  }

  private findConfig(provider: string, partner: any): any {
    if (!partner || !Array.isArray(partner.auth_config)) return null;
    return partner.auth_config.find(
      (c: any) => c && c.provider && c.provider.toLowerCase() === provider,
    ) || null;
  }

  /**
   * Checks if a provider is enabled for a given tenant partner.
   *
   * A tenant without an `auth_config` entry for the provider keeps the
   * pre-registry behaviour (enabled, env-backed); an entry with
   * `enabled: false` disables it.
   */
  public isProviderEnabled(providerName: string, partner: any): boolean {
    const config = this.findConfig(providerName.toLowerCase(), partner);
    if (!config) return true;
    return config.enabled !== false;
  }

  /**
   * Gets or creates a passport strategy for a tenant partner.
   *
   * Instances are keyed `${provider}:${partner.key}` and rebuilt when the
   * tenant's provider configuration changes (fingerprint mismatch) or after
   * the 5 minute TTL, matching the tenant middleware cache.
   */
  public getOrCreate(providerName: string, partner: any): TenantStrategyResolution {
    const provider = providerName.toLowerCase();
    const defaultName = this.defaultName(provider);

    if (!partner || !partner.key) {
      return { name: defaultName, strategy: null, tenantScoped: false };
    }

    const tenantConfig = this.findConfig(provider, partner);

    // No tenant-specific credentials: use the env-backed default strategy.
    if (!tenantConfig || !tenantConfig.properties || Object.keys(tenantConfig.properties).length === 0) {
      return { name: defaultName, strategy: null, tenantScoped: false };
    }

    const instanceName = `${provider}:${partner.key}`;
    const fingerprint = fingerprintOf(tenantConfig);
    const cached = this.cache.get(instanceName);
    if (cached && cached.fingerprint === fingerprint && cached.timestamp > Date.now() - CACHE_TTL_MS) {
      return { name: instanceName, strategy: cached.strategy, tenantScoped: true };
    }

    const factory = this.factories.get(provider);
    if (!factory) {
      logger.error(`No strategy factory registered for provider "${provider}"; refusing tenant ${partner.key}`);
      return { name: null, strategy: null, tenantScoped: true };
    }

    try {
      const strategy = factory(tenantConfig.properties, tenantConfig.options);
      if (strategy) {
        passport.use(instanceName, strategy);
        this.cache.set(instanceName, {
          strategy,
          name: instanceName,
          fingerprint,
          timestamp: Date.now(),
        });
        logger.debug(`Registered tenant passport strategy: ${instanceName}`);
        return { name: instanceName, strategy, tenantScoped: true };
      }
    } catch (err) {
      logger.error(`Error creating tenant strategy for ${instanceName}`, err);
    }

    logger.error(`Tenant ${partner.key} has an invalid ${provider} auth_config entry; refusing to fall back to the default application`);
    return { name: null, strategy: null, tenantScoped: true };
  }

  /**
   * Resolves the passport strategy name to invoke for a given partner, or
   * `null` when the tenant's configuration for the provider is unusable.
   */
  public getStrategyName(providerName: string, partner: any): string | null {
    return this.getOrCreate(providerName, partner).name;
  }

  /**
   * Invalidate cached strategies for a partner
   */
  public invalidate(partnerKey: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.endsWith(`:${partnerKey}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached strategies
   */
  public clear(): void {
    this.cache.clear();
  }
}

export const TenantStrategyRegistry = new TenantStrategyRegistryClass();
export default TenantStrategyRegistry;
