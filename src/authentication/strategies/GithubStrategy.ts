import { Strategy as GitHubStrategy } from 'passport-github';
import { OAuthProfile, OnDoneCallback } from './helpers';

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CLIENT_CALLBACK_URL = 'http://localhost:3000/auth/github/callback',
} = process.env;


const GitHubAuthentication = new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: GITHUB_CLIENT_CALLBACK_URL,
}, (accessToken: string, refreshToken: string, profile: OAuthProfile, done: OnDoneCallback) => {
  // This callback function is called when the user has successfully authenticated with GitHub.
  // The `profile` object contains information about the authenticated user.
  // You can use this information to find or create a corresponding user in your database.
  // Once you've found or created a user, you can call the `done` function to indicate success.

  const email = profile.emails && profile.emails[0].value;
  const avatarUrl = profile.photos && profile.photos[0].value;

  const user = {
    email,
    avatarUrl,
    githubId: profile.id,
    displayName: profile.displayName,
    username: profile.username,
  };

  // TODO: Find or create the user in your database
  // ...

  return done(null, user);
});

export default GitHubAuthentication;
