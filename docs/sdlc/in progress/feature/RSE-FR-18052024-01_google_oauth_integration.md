**Title:** Google PassportJS Integration

**Type:** Task

**Priority:** High

**Reporter:** Werner Weber

**Assignee:** Werner Weber

**Description:**

We need to integrate Google OAuth with our application using PassportJS. This will allow users to sign in using their Google accounts, improving the user experience and increasing the security of our application.

**Acceptance Criteria:**

1. Users can log in using their Google account.
2. User data retrieved from Google is correctly stored in our database.
3. Existing users can connect their Google account to their existing account in our application.
4. New users can register using their Google account.
5. Proper error handling is in place for failed Google OAuth attempts. This includes network errors, invalid credentials, expired tokens, and user cancellations.
6. Security measures such as HTTPS, token validation, and regular rotation of client secrets are implemented.
7. Detailed documentation on error handling and debugging OAuth issues is provided.
8. Unit and integration tests for the Google OAuth implementation are written and pass.

**Sub-Tasks:**

1. ~~Research how to integrate Google OAuth with PassportJS.~~
2. ~~Implement Google OAuth in a feature branch.~~ 
3. Write unit and integration tests for the Google OAuth implementation. ⬅️
4. Test the Google OAuth integration.
5. Review and merge the feature branch into the main branch.
6. Update internal and user-facing documentation to reflect the new integration.
7. Implement rate limiting and monitoring on the authentication endpoints.
8. Ensure a fallback mechanism for users if Google OAuth fails.

**Labels:** `Google OAuth`, `PassportJS`, `Integration`, `Server-Express`

**Due Date:** 21-05-2024 (Tuesday, 21st of May)

**Sources**:
**reactory-server-express/src/authentication/configure.ts**: Main authentication configuration entry point.
**reactory-server-express/src/authentication/strategies/GoogleStrategy.ts**: Main file for the Google strategy implementation.
**reactory-server-express/src/middleware/ReactoryClient.ts**: Middleware responsible for extracting the reactory client ID and secret key. We could potentially load the client ID from the session state.

**Comments:**

**Author**: Werner Weber
**Date**: 18-05-2024
**Comment**: Currently figuring out how to correctly hydrate the reactory client ID and secret from the state during the callback handled at /auth/google/callback. There is a dependency on session to hydrate from the session and set the correct context for the flow. We need to know which client ID it is, in order to redirect to the correct application outlet. Currently, when the flow executes, we are not able to set the callback URL to include client ID and secret key. Looking at using session state.

**Suggestions**:
**Co-pilot & ChatGPT4o**:
Based on the comment, it seems like the issue is about correctly identifying the client during the OAuth callback. Here are some potential solutions:

1. **Use URL Parameters:** You could include the client ID as a URL parameter in the callback URL. This would allow you to identify the client during the callback. However, this approach might have security implications as the client ID would be exposed in the URL.

2. **Use Session State:** As you mentioned, you could store the client ID in the session state when the user is redirected to Google for authentication. Then, during the callback, you could retrieve the client ID from the session state.

3. **Use a Database:** If you have multiple clients, you could store the client IDs and their corresponding callback URLs in a database. Then, during the callback, you could query the database to find the correct callback URL for the client ID.

4. **Use a Middleware:** You could use a middleware to set the correct context for the flow based on the client ID. This middleware would run before the callback handler and would set the client ID and secret key in the request object.

5. **State Parameter in OAuth Flow:** Use the `state` parameter in the OAuth request to include the client ID. The `state` parameter is designed to maintain state between the request and callback, and can be used to mitigate CSRF attacks.

Remember to carefully consider the security implications of each approach.
