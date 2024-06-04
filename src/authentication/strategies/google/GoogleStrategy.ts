
import { 
  encoder 
} from '@reactory/server-core/utils';
//@ts-ignore
import GoogleStrategy from 'passport-google-oidc';
import Helpers, { OnDoneCallback } from '../helpers';
import { Application, Response } from 'express';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from 'models';

const { 
  GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET',
  GOOLGE_CALLBACK_URL = 'http://localhost:4000/auth/google/callback',
} = process.env


const GoogleOAuthStrategy: passport.Strategy = new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: GOOLGE_CALLBACK_URL,
  passReqToCallback: true,
}, async (req: Reactory.Server.ReactoryExpressRequest, authority: string, profile: any, options: any, done: OnDoneCallback) => {
  // This callback function is called when the user has successfully authenticated with Google.
  // The `profile` object contains information about the authenticated user.
  // You can use this information to find or create a corresponding user in your database.
  // Once you've found or created a user, you can call the `done` function to indicate success.

  const email = profile.emails && profile.emails[0].value;
  const googleId = profile.id;
  const { name, displayName } = profile;
  
  const { context, session } = req;
  if(!context.partner) {
    // check if we have oauthState in the session
    // @ts-ignore
    if(!session.oauthState) {
      return done(new Error('Invalid state'), false);
    }
    // @ts-ignore
    const state = encoder.decodeState(session.oauthState as string);
    if(!state) {
      return done(new Error('Invalid state'), false);
    }

    const clientKey = state['x-client-key'];    

    const partner: Reactory.Models.IReactoryClientDocument = await ReactoryClient.findOne({ 
      key: clientKey 
    }).exec() as Reactory.Models.IReactoryClientDocument;

    if(!partner) {
      return done(new Error('Client not found'), false);
    }

    context.partner = partner;
  }
  const userService  = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

  const user = await userService.findUserWithEmail(email);
  if(!user) {
    const newUser = await userService.createUser({
      email,
      firstName: name.givenName,
      lastName: name.familyName,      
    });

    newUser.authentications.push({ 
      provider: 'google',
      lastLogin: new Date(),
      props: {
        googleId,
        displayName,
      }
    });

    await newUser.save()

    Helpers.generateLoginToken(newUser).then((loginToken: string) => { 
      return done(null, loginToken);
    });

  } else {
    const googleAuth = user.authentications.find((auth) => auth.provider === 'google');
    if(!googleAuth) {
      user.authentications.push({ 
        provider: 'google',
        lastLogin: new Date(),
        props: {
          googleId,
          displayName,
        }
      });

      await user.save();
    }

    Helpers.generateLoginToken(user).then((loginToken: string) => { 
      return done(null, loginToken);
    });
  }
});

export const useGoogleRoutes = (app: Application) => { 
  app.get(
    '/auth/google/start', 
    (req: Reactory.Server.ReactoryExpressRequest, res: Response, next) => {

      logger.debug('Starting Google OAuth flow');

      try {
        const state = encoder.encodeState({
          "x-client-key": req.query['x-client-key'],
          "x-client-pwd": req.query['x-client-pwd'],
        });
        // @ts-ignore
        req.session.oauthState = state;
        passport.authenticate('google', { 
          scope: [
            'openid', 'email', 'profile'
          ],
          passReqToCallback: true,
          state
        })(req, res, next);
      } catch (ex){
        logger.error('An error occurred while trying to authenticate with Google', ex);        
        res.status(500).send({ error: 'An error occurred while trying to authenticate with Google', ex });
      }
    } 
  );

  app.get('/auth/google/failure', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => { 
    res.status(401).send({ error: 'Authentication with Google failed' });
  });

  app.get(
    '/auth/google/callback', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
      const { context } = req;
      let failureRedirectUrl = '/auth/google/failure';
      if(context && context.partner) { 
        failureRedirectUrl = `${context.partner.siteUrl}/auth/google/failure`;
      }

      const onCompletion = (err: string, user: any) => {
        if(err) {
          res.status(500).send({ error: 'An error occurred while trying to authenticate with Google', err });
        } else {
          res.status(301).redirect(`${context.partner.siteUrl}?auth_token=${user.token}`);
        }
      };

      passport.authenticate('google', { 
        failureRedirect: failureRedirectUrl,
        passReqToCallback: true,
      }, onCompletion)(req, res);
    });
};

export default GoogleOAuthStrategy;