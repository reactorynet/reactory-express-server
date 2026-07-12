/**
 * Provider-agnostic OAuth token store.
 *
 * Persists tokens on the core User object's `authentications` array (the
 * platform convention — see `models/User.ts`), one entry per provider key.
 * Secret material (access/refresh tokens and any provider-specific `raw` blob
 * such as PKCE verifiers or client-registration data) is encrypted at rest with
 * AES-256-GCM; non-secret metadata (expiry, scopes, timestamps) is stored in the
 * clear for cheap status checks.
 *
 * The store is bound to a single user document. Callers that operate across
 * users construct one store per user (a future `core.OAuthTokenService` will do
 * exactly this). Read-modify-write is handled inside the store, so partial saves
 * (e.g. the SDK saving a code verifier before the tokens) merge safely.
 */
import Reactory from '@reactorynet/reactory-core';
import { encryptToken, decryptToken, generateEncryptionSalt, resolveMasterKey } from './token-crypto';

export interface StoredToken {
  accessToken?: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  scopes?: string[];
  accountId?: string;
  accountEmail?: string;
  /** Provider-specific opaque data (SDK OAuthTokens, clientInformation, codeVerifier, discovery). */
  raw?: Record<string, unknown>;
  connectedAt?: number;
  lastRefreshedAt?: number;
  revokedAt?: number;
}

export interface ITokenStore {
  get(providerKey: string): Promise<StoredToken | null>;
  /** Replace the stored token wholesale. */
  set(providerKey: string, token: StoredToken): Promise<void>;
  /** Merge `partial` into the existing token (top-level fields; `raw` shallow-merged). */
  patch(providerKey: string, partial: Partial<StoredToken>): Promise<StoredToken>;
  remove(providerKey: string): Promise<void>;
}

/** Persisted prop layout under a single `authentications` entry. */
interface PersistedProps {
  version: 1;
  encSalt: string;
  /** Encrypted JSON of { accessToken, refreshToken, raw }. */
  secret?: string;
  expiresAt?: number;
  scopes?: string[];
  accountId?: string;
  accountEmail?: string;
  connectedAt?: number;
  lastRefreshedAt?: number;
  revokedAt?: number;
}

interface SecretBundle {
  accessToken?: string;
  refreshToken?: string;
  raw?: Record<string, unknown>;
}

/** Minimal shape of the user document the store needs. */
export interface TokenStoreUser {
  getAuthentication(provider: string): { props?: Record<string, unknown> } | null | undefined;
  setAuthentication(auth: { provider: string; props: Record<string, unknown>; lastLogin?: Date }): Promise<boolean> | boolean;
  removeAuthentication(provider: string): Promise<boolean> | boolean;
}

export class UserAuthenticationsTokenStore implements ITokenStore {
  private readonly user: TokenStoreUser;
  private readonly masterKey: string;

  constructor(user: TokenStoreUser, masterKey: string = resolveMasterKey()) {
    this.user = user;
    this.masterKey = masterKey;
  }

  async get(providerKey: string): Promise<StoredToken | null> {
    const entry = this.user.getAuthentication(providerKey);
    const props = entry?.props as PersistedProps | undefined;
    if (!props || !props.encSalt) return null;

    let bundle: SecretBundle = {};
    if (props.secret) {
      try {
        bundle = JSON.parse(decryptToken(props.secret, props.encSalt, this.masterKey)) as SecretBundle;
      } catch {
        // Corrupt / key-rotated secret — treat as no token rather than throwing.
        bundle = {};
      }
    }

    return {
      accessToken: bundle.accessToken,
      refreshToken: bundle.refreshToken,
      raw: bundle.raw,
      expiresAt: props.expiresAt,
      scopes: props.scopes,
      accountId: props.accountId,
      accountEmail: props.accountEmail,
      connectedAt: props.connectedAt,
      lastRefreshedAt: props.lastRefreshedAt,
      revokedAt: props.revokedAt,
    };
  }

  async set(providerKey: string, token: StoredToken): Promise<void> {
    const existing = this.user.getAuthentication(providerKey);
    const existingProps = existing?.props as PersistedProps | undefined;
    const encSalt = existingProps?.encSalt || generateEncryptionSalt();

    const bundle: SecretBundle = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      raw: token.raw,
    };

    const props: PersistedProps = {
      version: 1,
      encSalt,
      secret: encryptToken(JSON.stringify(bundle), encSalt, this.masterKey),
      expiresAt: token.expiresAt,
      scopes: token.scopes,
      accountId: token.accountId,
      accountEmail: token.accountEmail,
      connectedAt: token.connectedAt ?? existingProps?.connectedAt ?? Date.now(),
      lastRefreshedAt: token.lastRefreshedAt,
      revokedAt: token.revokedAt,
    };

    await this.user.setAuthentication({ provider: providerKey, props, lastLogin: new Date() });
  }

  async patch(providerKey: string, partial: Partial<StoredToken>): Promise<StoredToken> {
    const current = (await this.get(providerKey)) ?? {};
    const merged: StoredToken = {
      ...current,
      ...partial,
      raw: { ...(current.raw ?? {}), ...(partial.raw ?? {}) },
    };
    await this.set(providerKey, merged);
    return merged;
  }

  async remove(providerKey: string): Promise<void> {
    await this.user.removeAuthentication(providerKey);
  }
}
