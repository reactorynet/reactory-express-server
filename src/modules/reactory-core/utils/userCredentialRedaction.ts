/**
 * Credential redaction for User records.
 *
 * One definition of "what is secret on a user", shared by:
 *  - the User schema's `toJSON` transform, so `JSON.stringify` / `res.json()` of
 *    any hydrated user - including one populated into another record without a
 *    projection - never serialises a credential;
 *  - the GraphQL `User.sessionInfo` and `UserAuthentication.props` resolvers.
 *
 * Only `toJSON` is transformed, not `toObject`: server code legitimately reads
 * `password`/`salt` from the live document (password verification, the reset
 * fingerprint in `routes/useraccount/UserAccount.ts`), and none of it goes
 * through JSON.
 *
 * This module must not import any model: `models/User.ts` imports it.
 */

/**
 * `authentications[].props` keys that are bookkeeping, not secrets. Everything
 * else (access/refresh tokens, API keys, provider secrets) is dropped.
 */
export const AUTHENTICATION_PROPS_ALLOWED_KEYS: readonly string[] = Object.freeze([
  'lastLogin',
  'loginCount',
  'failedLoginAttempts',
  'lockoutExpiry',
  'twoFactorEnabled',
]);

const toPlain = (value: any): any => {
  if (value && typeof value.toObject === 'function') return value.toObject();
  if (value && typeof value === 'object') return { ...value };
  return value;
};

/** Keeps only the allowlisted keys of an authentication's `props`. */
export const redactAuthenticationProps = (props: any): Record<string, any> | null => {
  if (!props || typeof props !== 'object') return null;
  const safe: Record<string, any> = {};
  for (const key of AUTHENTICATION_PROPS_ALLOWED_KEYS) {
    if (props[key] !== undefined) safe[key] = props[key];
  }
  return safe;
};

/**
 * A session without its token material: `jwtPayload` carries the live refresh
 * token and `jwtPayloadJson` the signed claims; a top-level `refresh` is
 * removed too in case a legacy record stored it there.
 */
export const redactSession = (session: any): Record<string, any> => {
  const plain = toPlain(session) || {};
  const { refresh, jwtPayload, jwtPayloadJson, ...metadata } = plain;
  return metadata;
};

export const redactAuthentication = (authentication: any): Record<string, any> => {
  const plain = toPlain(authentication) || {};
  if ('props' in plain) plain.props = redactAuthenticationProps(plain.props);
  return plain;
};

/**
 * Removes every credential from a plain user object, in place, and returns it.
 * Shaped as a Mongoose `toJSON` transform body (`ret` in, `ret` out).
 */
export const redactUserCredentials = <T extends Record<string, any>>(user: T): T => {
  if (!user || typeof user !== 'object') return user;
  const target: Record<string, any> = user;
  delete target.password;
  delete target.salt;
  if (Array.isArray(target.sessionInfo)) {
    target.sessionInfo = target.sessionInfo.map(redactSession);
  }
  if (Array.isArray(target.authentications)) {
    target.authentications = target.authentications.map(redactAuthentication);
  }
  return user;
};
