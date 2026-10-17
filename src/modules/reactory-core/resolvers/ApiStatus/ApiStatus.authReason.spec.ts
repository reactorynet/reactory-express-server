/**
 * `ApiStatus.authReason` — why a session-backed token was refused.
 *
 * The value is read straight off the request context, where the JWT strategy
 * records a rejected session. It exists so a client can tell "this token belongs
 * to a different application" apart from "you are signed out", rather than
 * inferring it from an anonymous status.
 */
import ApiStatus from './ApiStatus';

describe('ApiStatus.authReason', () => {
  const resolver: any = new (ApiStatus as any)();

  it('is null when no session-backed token was refused', () => {
    expect(resolver.authReason(undefined, {}, {} as any)).toBeNull();
  });

  it('is null when the context carries no recorded failure', () => {
    expect(resolver.authReason(undefined, {}, { user: null } as any)).toBeNull();
  });

  it('reports a client mismatch', () => {
    const context: any = {
      authFailure: {
        state: 'client_mismatch',
        reason: 'session_client_mismatch',
        clientKey: 'compute-planner',
      },
    };

    expect(resolver.authReason(undefined, {}, context)).toBe('session_client_mismatch');
  });

  it('reports a revoked session distinctly', () => {
    const context: any = { authFailure: { state: 'revoked', reason: 'session_revoked' } };

    expect(resolver.authReason(undefined, {}, context)).toBe('session_revoked');
  });
});
