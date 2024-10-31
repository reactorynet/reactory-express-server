import Reactory from '@reactory/reactory-core';
import jwt from 'jwt-simple';
import moment, { DurationInputArg1, DurationInputArg2 } from 'moment';
import { v4 as uuid } from 'uuid';
import { isNil } from 'lodash';
import { UserValidationError } from '@reactory/server-core/exceptions';
import { User } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';
import amq from '@reactory/server-core/amq';

const jwtSecret = process.env.SECRET_SAUCE;

export type OnDoneCallback = (error: Error | null, user?: Partial<Reactory.Models.IUserDocument> | string | false, info?: any) => void;

export interface OAuthProfile {
  id: string;
  displayName: string;
  username?: string;
  name?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
  emails?: {
    value: string;
    verified?: boolean;
  }[];
  photos?: {
    value: string;
  }[];
}


export default class Helpers {
  static JwtAuth = (payload: any, done: Function) => {
    logger.debug(`JWT Auth executing`, payload);
    if (payload.userId === '-1') {
      return done(null, {
        _id: "ANON",
        id: -1,
        firstName: 'Guest',
        lastName: 'User',
        roles: ['ANON'],
        memberships: [],
        avatar: null,
        anon: true,
      });
    }

    if (payload.exp !== null) {
      if (moment(payload.exp).isBefore(moment())) {
        logger.info('token expired');
        return done(null, false);
      }
    } else { return done(null, false); }

    if (payload.userId) {
      User.findById(payload.userId).then((userResult) => {
        if (isNil(userResult)) {
          return done(null, false);
        }
        //req.user = userResult;
        amq.raiseWorkFlowEvent('user.authenticated', { user: userResult, payload, method: 'bearer-token' });
        return done(null, userResult);
      });
    } else return done(null, false);
  }

  static jwtMake = (payload: any) => { return jwt.encode(payload, jwtSecret); };

  static jwtTokenForUser = (user: Reactory.Models.IUserDocument, options = {}) => {
    if (isNil(user)) throw new UserValidationError('User object cannot be null', { context: 'jwtTokenForUser' });

    const {
      JWT_ISSUER = 'id.reactory.net',
      JWT_SUB = 'reactory-auth',
      JWT_AUD = 'app.reactory.net',
      JWT_EXP_AMOUNT = 24,
      JWT_EXP_UNIT = 'h',
    } = process.env;

    const authOptions = {
      iss: JWT_ISSUER,
      sub: JWT_SUB,
      aud: JWT_AUD,
      exp: moment().add(
        JWT_EXP_AMOUNT as DurationInputArg1, 
        JWT_EXP_UNIT as DurationInputArg2
      ).valueOf(),
      iat: moment().valueOf(),
      ...options,
    };

    return {
      ...authOptions,
      userId: `${user._id.toString()}`,
      refresh: uuid(),
      name: `${user.firstName} ${user.lastName}`,
    };
  }

  static addSession = async (user: Reactory.Models.IUserDocument, token: any, ip = '-', clientId = 'not-set') => {
    user.sessionInfo = [];
    user.sessionInfo.push({
      id: uuid(),
      host: ip,
      client: clientId,
      jwtPayload: token,
    });

    try { 
      await user.save();
    } catch (err) {
      logger.error(`Error saving user session info`, err);
    }

    return user;
  }

  static generateLoginToken = async (user: Reactory.Models.IUserDocument, ip = 'none'): Promise<{
    id: string,
    firstName: string,
    lastName: string,
    token: string,
  }> => {
    logger.info(`generating Login token for user ${user.firstName} ${user.lastName}`);
    user.lastLogin = moment().valueOf(); // eslint-disable-line
    const jwtPayload = Helpers.jwtTokenForUser(user);
    await Helpers.addSession(user, jwtPayload, ip);
    return {
      id: user?._id?.toHexString(),
      firstName: user.firstName,
      lastName: user.lastName,
      token: Helpers.jwtMake(jwtPayload),
    };
  }; 
}