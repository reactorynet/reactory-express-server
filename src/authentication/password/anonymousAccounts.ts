import crypto from 'crypto';
import logger from '@reactory/server-core/logging';

/**
 * Seed definitions for the anonymous accounts every tenant needs at boot.
 *
 * The PWA signs in as `anonymous@reactory.local` to obtain its anonymous JWT,
 * so that password ships in the browser bundle and is public by design. The
 * control that matters is that these accounts only ever hold the `ANON` role.
 * Even so, no fixed default is seeded: when REACTORY_APPLICATION_ANONUSER_PASSWORD
 * is absent a random password is generated and a warning (never the value)
 * is logged. Set the variable, and REACT_APP_ANONUSER_PASSWORD in the PWA
 * build, to the same value to enable anonymous boot on a fresh database.
 */
export interface AnonymousAccountSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  generatedPassword: boolean;
}

export const ANONYMOUS_PASSWORD_ENV = 'REACTORY_APPLICATION_ANONUSER_PASSWORD';

const generatePassword = (): string => crypto.randomBytes(24).toString('base64url');

export const anonymousAccountSeeds = (env: NodeJS.ProcessEnv = process.env): AnonymousAccountSeed[] => {
  const configured = env[ANONYMOUS_PASSWORD_ENV];
  const accounts = [
    { email: 'anon@reactor.local', firstName: 'Anonymous', lastName: 'User', username: 'anon' },
    { email: 'anonymous@reactory.local', firstName: 'Anonymous', lastName: 'Local', username: 'anonymous' },
  ];
  return accounts.map((account) => ({
    ...account,
    password: configured || generatePassword(),
    generatedPassword: !configured,
  }));
};

/**
 * Log, once per seeded account, that a generated password was used.
 */
export const warnGeneratedAnonymousPassword = (seed: AnonymousAccountSeed, tenantKey: string): void => {
  if (!seed.generatedPassword) return;
  logger.warn(
    `Seeded anonymous user ${seed.email} on ${tenantKey} with a generated random password because ` +
    `${ANONYMOUS_PASSWORD_ENV} is not set. Anonymous PWA boot will fail until ${ANONYMOUS_PASSWORD_ENV} ` +
    'and the PWA REACT_APP_ANONUSER_PASSWORD are set to the same value and the account password is reset.'
  );
};
