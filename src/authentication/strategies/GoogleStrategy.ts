import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Helpers, { OnDoneCallback } from './helpers';

const { 
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOLGE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback',
} = process.env


const GoogleAuthStrategy = new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, (accessToken: string, refreshToken: string, profile: any, done: OnDoneCallback) => {
  // This callback function is called when the user has successfully authenticated with Google.
  // The `profile` object contains information about the authenticated user.
  // You can use this information to find or create a corresponding user in your database.
  // Once you've found or created a user, you can call the `done` function to indicate success.

  const email = profile.emails && profile.emails[0].value;
  const avatarUrl = profile.photos && profile.photos[0].value;

  const user = {
    email,
    avatarUrl,
    googleId: profile.id,
    displayName: profile.displayName,
  };

  // TODO: Find or create the user in your database
  // ...

  return done(null, user);
});

export default GoogleAuthStrategy;