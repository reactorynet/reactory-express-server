import { default as AnonymousStrategy } from './AnonStrategy';
import { 
  default as LocalStrategy, 
  useReactoryLocalRoutes,
} from './LocalStrategy';
import { default as JwtStrategy } from './JWTStrategy';
import { default as GoogleStrategy } from './GoogleStrategy';
import { default as FacebookStrategy } from './FacebookStrategy';
import { default as GithubStrategy } from './GithubStrategy';
import { default as TwitterStrategy } from './TwitterStrategy';
import { default as LinkedInStrategy } from './LinkedInStrategy';
import { 
  default as MicrosoftStrategy,
  useMicrosoftRoutes,
} from './MicrosoftStrategy';

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
  },
  {
    name: 'facebook',
    strategy: FacebookStrategy,
  },
  {
    name: 'github',
    strategy: GithubStrategy,
  },
  {
    name: 'twitter',
    strategy: TwitterStrategy,
  },
  {
    name: 'linkedin',
    strategy: LinkedInStrategy,
  },
  {
    name: 'microsoft',
    strategy: MicrosoftStrategy,
    configure: useMicrosoftRoutes,
  }
];

export default PassportProviders;