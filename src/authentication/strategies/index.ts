import { default as AnonymousStrategy } from './AnonStrategy';
import { 
  default as LocalStrategy, 
  useReactoryLocalRoutes,
} from './LocalStrategy';
import { default as JwtStrategy } from './JWTStrategy';
import { default as GoogleStrategy, useGoogleRoutes } from './google/GoogleStrategy';
import { default as FacebookStrategy, useFacebookRoutes } from './facebook/FacebookStrategy';
import { default as GithubStrategy, useGithubRoutes } from './github/GithubStrategy';
import { default as LinkedInStrategy, useLinkedInRoutes } from './linkedin/LinkedInStrategy';
import { 
  default as MicrosoftStrategy,
  useMicrosoftRoutes,
} from './microsoft/MicrosoftStrategy';
import { default as OktaStrategy, useOktaRoutes } from './okta/OktaStrategy';

const PassportProviders: Reactory.Server.ReactoryPassportProviders = [
  {
    name: 'anon',
    strategy: AnonymousStrategy,
  },
  {
    name: 'local',
    strategy: LocalStrategy,
    configure: useReactoryLocalRoutes,
  },
  {
    name: 'jwt',
    strategy: JwtStrategy,
  },
  {
    name: 'google',
    strategy: GoogleStrategy,
    configure: useGoogleRoutes,
  },
  {
    name: 'facebook',
    strategy: FacebookStrategy,
    configure: useFacebookRoutes,
  },
  {
    name: 'github',
    strategy: GithubStrategy,
    configure: useGithubRoutes,
  },
  {
    name: 'linkedin',
    strategy: LinkedInStrategy,
    configure: useLinkedInRoutes,
  },
  {
    name: 'microsoft',
    strategy: MicrosoftStrategy,
    configure: useMicrosoftRoutes,
  },
  {
    name: 'okta',
    strategy: OktaStrategy,
    configure: useOktaRoutes,
  }
];

export default PassportProviders;