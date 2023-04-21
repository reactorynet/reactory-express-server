/**
 * Module dependencies.
 */
import logger from '@reactory/server-core/logging';
import passport, { Strategy, StrategyCreatedStatic } from 'passport';


export interface IAnonUser {
  id: number;
  firstName: string;
  lastName: string;
  roles: string[];
  memberships: string[];
  avatar: string | null;
  anon: boolean;
  hasRole: (clientId: string, role: string) => boolean;
}

class AnonymousStrategy extends Strategy implements StrategyCreatedStatic {
  name = 'anonymous';

  authenticate(): void {
    logger.debug("Authenticating user as anonymous.");
    const anonUser: IAnonUser = {
      id: -1,
      firstName: 'Guest',
      lastName: 'User',
      roles: ['ANON'],
      memberships: [],
      avatar: null,
      anon: true,
      hasRole: (_: string, role: string ) => { return role === 'ANON'; },
    };
    this.success(anonUser);
  }
}

const ReactoryAnonStrategy = new AnonymousStrategy();
export default ReactoryAnonStrategy;