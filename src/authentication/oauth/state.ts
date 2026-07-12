/**
 * Stateless OAuth `state` parameter (CSRF protection) for OAuth flows.
 *
 * Built on `encoder` (AES-256-CBC + HMAC over SECRET_SAUCE), so state is
 * self-contained and survives across processes/instances — unlike the legacy
 * in-memory `StateManager`. The encoded value is carried in the OAuth `state`
 * query parameter and validated on the callback.
 */
import { encoder } from '@reactory/server-core/utils';
import { v4 as uuid } from 'uuid';

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStateData {
  /** Flow discriminator, e.g. 'mcp', 'google', 'linkedin'. */
  flow: string;
  clientKey?: string;
  userId?: string;
  /** MCP: the catalog/connection server id being authorized. */
  serverId?: string;
  /** Where to send the user agent after a successful callback. */
  redirectTo?: string;
  nonce: string;
  ts: number;
}

/** Create an opaque, tamper-evident state token carrying `data`. */
export const createState = (data: Omit<OAuthStateData, 'nonce' | 'ts'>): string =>
  encoder.encodeState({ ...data, nonce: uuid(), ts: Date.now() });

/**
 * Validate + decode a state token. Returns null when the value is missing,
 * tampered (HMAC mismatch), malformed, or older than `ttlMs`.
 */
export const consumeState = (
  encoded: string | undefined | null,
  ttlMs: number = DEFAULT_TTL_MS
): OAuthStateData | null => {
  if (!encoded) return null;
  const decoded = encoder.decodeState(encoded) as OAuthStateData | null;
  if (!decoded || typeof decoded.ts !== 'number' || !decoded.nonce) return null;
  if (Date.now() - decoded.ts > ttlMs) return null;
  return decoded;
};
