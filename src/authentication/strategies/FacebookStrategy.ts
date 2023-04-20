import { Strategy as FacebookStrategy } from 'passport-facebook';

const {
  FACEBOOK_APP_ID = 'FACEBOOK_APP_ID',
  FACEBOOK_APP_SECRET = 'FACEBOOK_APP_SECRET',
  FACEBOOK_APP_CALLBACK_URL = 'http://localhost:3000/auth/facebook/callback',
} = process.env;

const FaceBookAuthStrategy = new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: FACEBOOK_APP_CALLBACK_URL,
  profileFields: ['id', 'email', 'name', 'picture.type(large)'],
}, (accessToken, refreshToken, profile, done) => {
  // This callback function is called when the user has successfully authenticated with Facebook.
  // The `profile` object contains information about the authenticated user.
  // You can use this information to find or create a corresponding user in your database.
  // Once you've found or created a user, you can call the `done` function to indicate success.

  const email = profile.emails && profile.emails[0].value;
  const avatarUrl = profile.photos && profile.photos[0].value;

  const user = {
    email,
    avatarUrl,
    facebookId: profile.id,
    firstName: profile.name.givenName,
    lastName: profile.name.familyName,
  };

  // TODO: Find or create the user in your database
  // ...

  return done(null, user);
});

export default FaceBookAuthStrategy;