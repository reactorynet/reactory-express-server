

import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { OnDoneCallback } from './helpers';

const {
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_CALLBACK_URL = 'http://localhost:3000/auth/linkedin/callback',
} = process.env;

const LinkedInAuthStrategy =  new LinkedInStrategy({
    clientID: LINKEDIN_CLIENT_ID,
    clientSecret: LINKEDIN_CLIENT_SECRET,
    callbackURL: LINKEDIN_CALLBACK_URL,
    scope: ['r_emailaddress', 'r_liteprofile'],
  }, (accessToken: string, refreshToken: string, profile: any, done: OnDoneCallback) => {
    // This callback function is called when the user has successfully authenticated with LinkedIn.
    // The `profile` object contains information about the authenticated user.
    // You can use this information to find or create a corresponding user in your database.
    // Once you've found or created a user, you can call the `done` function to indicate success.

    const email = profile.emails && profile.emails[0].value;
    const avatarUrl = profile.photos && profile.photos[0].value;

    const user = {
      email,
      avatarUrl,
      linkedinId: profile.id,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
    };

    // TODO: Find or create the user in your database
    // ...

    return done(null, user);
  });

export default LinkedInAuthStrategy;
