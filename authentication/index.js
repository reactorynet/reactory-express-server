import passport from 'passport';
import jwt from 'jwt-simple';
import moment from 'moment';
import uuid from 'uuid';
import { isNil } from 'lodash';
// import LocalStrategy from 'passport-local';
import { BasicStrategy } from 'passport-http';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../models/index';
import { UserValidationError } from '../exceptions';

const jwtSecret = process.env.SECRET_SAUCE;

class AuthConfig {
    static Configure = (app) => {
      passport.initialize();
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

    static jwtTokenForUser = (user) => {
      if (isNil(user)) throw new UserValidationError('User object cannot be null', { context: 'jwtTokenForUser' });

      return {
        iss: 'id.reactory.com',
        sub: 'reactory-auth',
        aud: ['reactory', 'developers', 'api'],
        exp: moment().add('24', 'h').valueOf(),
        iat: moment().valueOf(),
        userId: user._id.toString(), // eslint-disable-line no-underscore-dangle
        refresh: uuid(),
        name: `${user.firstName} ${user.lastName}`,
        memberships: user.memberships,
      };
    }

    static addSession = (user, token, ip = '-', clientId = 'not-set') => {
      console.log('adding session', { user, token, ip, clientId });
      if (isNil(user.sessionInfo) === true) user.sessionInfo = [];
      user.sessionInfo.push({
        id: uuid(),
        host: ip,
        client: clientId,
        token,
      });

      return user.save();
    }

    static generateLoginToken = (user, ip = 'none') => {
      console.log('generating Login token');
      return new Promise((resolve, reject) => {
        user.lastLogin = moment().valueOf(); // eslint-disable-line 
        const jwtPayload = AuthConfig.jwtTokenForUser(user);
        AuthConfig.addSession(user, jwtPayload, ip).then((savedUser) => {
          resolve({
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            token: AuthConfig.jwtMake(jwtPayload),
          });
        }).catch((sessionSetError) => { reject(sessionSetError); });
      });
    };

    static BasicAuth = (req, username, password, done) => {
      console.log('Basic auth starting');
      User.findOne({ email: username }).then((userResult) => {
        if (userResult === null) done(null, false, 'username not found');
        if (userResult.validatePassword(password) === true) {
          AuthConfig.generateLoginToken(userResult).then((loginToken) => {
            console.log('User logged in and session added', loginToken);
            done(null, loginToken);
          });
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
