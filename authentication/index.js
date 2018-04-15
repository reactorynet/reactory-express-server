import passport from 'passport';
import jwt from 'jwt-simple';
import moment from 'moment';
import uuid from 'uuid';
// import LocalStrategy from 'passport-local';
import { BasicStrategy } from 'passport-http';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../models/index';

const jwtSecret = process.env.SECRET_SAUCE;

class AuthConfig {
    static Configure = (app) => {
      passport.initialize();
      // passport.use(new LocalStrategy(AuthConfig.BasicAuth));
      passport.use(new BasicStrategy({ passReqToCallback: true }, AuthConfig.BasicAuth));
      passport.use(new JwtStrategy(AuthConfig.JwtOptions, AuthConfig.JwtAuth));
      app.post(
        '/login',
        passport.authenticate('basic', { session: false }),
        (req, res) => {
          res.json({ user: req.user });
        },
      );  
    };

    static JwtOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    }

    static JwtAuth = (payload, done) => {
      console.log('JWT Auth executing', payload);
      return done(null, true);
    }

    static jwtMake = (payload) => { return jwt.encode(payload, jwtSecret); };

    static BasicAuth = (req, username, password, done) => {
      User.findOne({ username }).then((userResult) => {
        console.log('Finding User', { userResult });
        if (userResult === null) done(null, false, 'username not found');
        if (userResult.validatePassword(password) === true) {
          const jwtPayload = {
            iss: 'id.reactory.com',
            sub: 'reactory-auth',
            aud: ['reactory', 'developers', 'api'],
            exp: moment().add('24', 'h').valueOf(),
            iat: moment().valueOf(),
            userId: userResult._id.toString(), // eslint-disable-line no-underscore-dangle
            refresh: uuid(),
            name: `${userResult.firstName} ${userResult.lastName}`,
            roles: userResult.roles,
          };

          userResult.lastLogin = new Date(); // eslint-disable-line 
          userResult.sessionInfo.push({
            id: uuid(),
            host: req.ip,
            client: req.headers['x-client-id'] || 'not-set',
            jwtPayload,
          });
          userResult.save();

          done(null, { token: AuthConfig.jwtMake(jwtPayload) });
        } else {
          done(null, false, 'Could not authenticate the account');
        }
      }).catch((error) => {
        console.error('Authentication Error', error);
        return done(null, false, 'System is unable to authenticate user due to an error');
      });
    };
}

export default AuthConfig;
