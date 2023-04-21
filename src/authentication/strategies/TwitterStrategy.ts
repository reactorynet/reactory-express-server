import { Strategy as TwitterStrategy } from 'passport-twitter';

const {
  TWITTER_CONSUMER_KEY = 'TWITTER_CONSUMER_KEY',
  TWITTER_CONSUMER_SECRET = 'TWITTER_CONSUMER_SECRET',
  TWITTER_CALLBACK_URL = 'http://localhost:3000/auth/twitter/callback',
} = process.env

const TwitterAuthentication = new TwitterStrategy({
  consumerKey: TWITTER_CONSUMER_KEY,
  consumerSecret: TWITTER_CONSUMER_SECRET,
  callbackURL: TWITTER_CALLBACK_URL,
  includeEmail: true,
}, (token, tokenSecret, profile, done) => {
  // This callback function is called when the user has successfully authenticated with Twitter.
  // The `profile` object contains information about the authenticated user.
  // You can use this information to find or create a corresponding user in your database.
  // Once you've found or created a user, you can call the `done` function to indicate success.

  const email = profile.emails && profile.emails[0].value;
  const avatarUrl = profile.photos && profile.photos[0].value;

  const user = {
    email,
    avatarUrl,
    twitterId: profile.id,
    displayName: profile.displayName,
    username: profile.username,
  };

  // TODO: Find or create the user in your database
  // ...

  return done(null, user);
});

export default TwitterAuthentication;