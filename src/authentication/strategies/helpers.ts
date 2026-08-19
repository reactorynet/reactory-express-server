import Reactory from '@reactorynet/reactory-core';
import jwt from 'jwt-simple';
import moment, { DurationInputArg1, DurationInputArg2 } from 'moment';
import { v4 as uuid } from 'uuid';
import { isNil } from 'lodash';
import { UserValidationError } from '@reactory/server-core/exceptions';
import { User } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';
import amq from '@reactory/server-core/amq';
import Redis, { RedisOptions } from 'ioredis';
import AuthTelemetry from './telemetry';

const jwtSecret = process.env.SECRET_SAUCE;

let sessionRedisClient: Redis | null = null;

const getSessionRedisClient = (): Redis | null => {
  if (sessionRedisClient) return sessionRedisClient;
  try {
    const redisConfig: RedisOptions = {
      host: process.env.REACTORY_REDIS_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_REDIS_PORT || '6379', 10),
      password: process.env.REACTORY_REDIS_PASSWORD || 'reactory',
      db: parseInt(process.env.REACTORY_REDIS_DB || '0', 10),
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    };
    sessionRedisClient = new Redis(redisConfig);
    sessionRedisClient.on('error', (err) => {
      logger.debug(`[Helpers.sessionRedis] Redis connection error: ${err.message}`);
    });
    return sessionRedisClient;
  } catch {
    return null;
  }
};

export const invalidateUserSessionCache = async (userId: string): Promise<void> => {
  if (!userId) return;
  try {
    const client = getSessionRedisClient();
    if (client) {
      const key = `reactory:security:sessions:${userId}`;
      await client.del(key);
      logger.debug(`[Helpers] Invalidated Redis session cache for user ${userId}`);
    }
  } catch (err: any) {
    logger.warn(`[Helpers] Failed to invalidate Redis session cache for user ${userId}: ${err?.message}`);
  }
};

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

    if (isNil(payload.exp)) {
      return done(null, false);
    }

    if (moment(payload.exp).isBefore(moment())) {
      logger.info('token expired');
      return done(null, false);
    }

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

  static jwtTokenForUser = (user: Reactory.Models.IUserDocument, options: {
    exp?: number,
    iat?: number,
    iss?: string,
    sub?: string,
    aud?: string,
  } = {}) => {
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

  static getJwtTokenForUser = (user: Reactory.Models.IUserDocument, options: {
    exp?: number,
    iat?: number,
    iss?: string,
    sub?: string,
    aud?: string,
  } = {}) => {  
    return Helpers.jwtMake(Helpers.jwtTokenForUser(user, options));
  }

  static addSession = async (user: Reactory.Models.IUserDocument, token: any, ip = '-', clientId = 'not-set') => {
    // Reactory is a multitenant host: a single user can hold concurrent
    // sessions across multiple partner applications, as well as multiple active
    // sessions against the same partner (e.g. multi-tab / multi-device).
    const now = moment();
    const maxPerClient = parseInt(process.env.REACTORY_MAX_SESSIONS_PER_CLIENT || '10', 10);
    const maxTotal = parseInt(process.env.REACTORY_MAX_TOTAL_SESSIONS || '50', 10);

    const userId = user._id ? (typeof user._id.toString === 'function' ? user._id.toString() : String(user._id)) : null;

    // To prevent in-memory lost updates from concurrent requests, fetch latest sessionInfo from Mongo if possible
    let existingSessions: any[] = [];
    if (userId) {
      try {
        const freshUser: any = await User.findById(userId).select('sessionInfo').lean().exec();
        if (freshUser && Array.isArray(freshUser.sessionInfo)) {
          existingSessions = freshUser.sessionInfo;
        } else if (Array.isArray(user.sessionInfo)) {
          existingSessions = user.sessionInfo;
        }
      } catch {
        existingSessions = Array.isArray(user.sessionInfo) ? user.sessionInfo : [];
      }
    } else {
      existingSessions = Array.isArray(user.sessionInfo) ? user.sessionInfo : [];
    }

    // 1. Prune expired sessions across all partners
    let validSessions = existingSessions.filter((session: any) => {
      if (!session?.jwtPayload?.exp) return true;
      return moment(session.jwtPayload.exp).isAfter(now);
    });

    // 2. Cap concurrent sessions per client/partner
    const clientSessions = validSessions.filter((session: any) => session.client === clientId);
    if (clientSessions.length >= maxPerClient) {
      clientSessions.sort((a: any, b: any) => (a.jwtPayload?.iat || 0) - (b.jwtPayload?.iat || 0));
      const toRemoveCount = clientSessions.length - maxPerClient + 1;
      const removeIds = new Set(clientSessions.slice(0, toRemoveCount).map((s: any) => s.id));
      validSessions = validSessions.filter((s: any) => !removeIds.has(s.id));
    }

    // 3. Cap total sessions across all partners
    if (validSessions.length >= maxTotal) {
      validSessions.sort((a: any, b: any) => (a.jwtPayload?.iat || 0) - (b.jwtPayload?.iat || 0));
      const toRemoveCount = validSessions.length - maxTotal + 1;
      const removeIds = new Set(validSessions.slice(0, toRemoveCount).map((s: any) => s.id));
      validSessions = validSessions.filter((s: any) => !removeIds.has(s.id));
    }

    // 4. Add the new session
    const sessionId = uuid();
    validSessions.push({
      id: sessionId,
      host: ip,
      client: clientId,
      jwtPayload: token,
    });

    user.sessionInfo = validSessions;

    // Use atomic update to avoid clobbering by in-memory saves
    if (userId) {
      try {
        if (typeof (User as any).updateOne === 'function') {
          await (User as any).updateOne({ _id: user._id }, { $set: { sessionInfo: validSessions, lastLogin: new Date() } }).exec();
        } else {
          await user.save();
        }
      } catch (err) {
        logger.error(`Error saving user session info atomically`, err);
        try {
          await user.save();
        } catch (saveErr) {
          logger.error(`Error in fallback save`, saveErr);
        }
      }
    } else {
      try {
        await user.save();
      } catch (err) {
        logger.error(`Error saving user session info`, err);
      }
    }

    // 5. Invalidate Redis session cache so SecurityService and JWTStrategy immediately pick up the new session
    if (userId) {
      await invalidateUserSessionCache(userId);
    }

    return user;
  }

  static generateLoginToken = async (user: Reactory.Models.IUserDocument, ip = 'none', clientId = 'not-set'): Promise<{
    id: string,
    firstName: string,
    lastName: string,
    token: string,
  }> => {
    logger.info(`generating Login token for user ${user.firstName} ${user.lastName}`);

    try {
      user.lastLogin = moment().valueOf(); // eslint-disable-line
      const jwtPayload = Helpers.jwtTokenForUser(user);
      await Helpers.addSession(user, jwtPayload, ip, clientId);
      
      const token = Helpers.jwtMake(jwtPayload);
      
      // Record JWT token generation in telemetry
      try {
        AuthTelemetry.recordTokenGeneration(user._id.toString(), 'system');
      } catch (telemetryError) {
        logger.error('Failed to record token generation metric', telemetryError);
        // Continue - don't fail auth due to telemetry error
      }
      
      return {
        id: typeof user?._id?.toHexString === 'function' ? user._id.toHexString() : user?._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        token,
      };
    } catch (error) {
      logger.error('Error generating login token', error);
      throw error;
    }
  }; 
}