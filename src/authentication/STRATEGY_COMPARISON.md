# Authentication Strategies - Feature Comparison Matrix

## Quick Status Overview

| Strategy | Status | Database Integration | Token Generation | Routes | State Mgmt | Tests | Docs | Priority |
|----------|--------|---------------------|------------------|--------|------------|-------|------|----------|
| **Anon** | ✅ Complete | ✅ N/A | ✅ Yes | ✅ N/A | ✅ N/A | ✅ Yes | ✅ Yes | High |
| **JWT** | ✅ Complete | ✅ Yes | ✅ Yes | ✅ N/A | ✅ N/A | ✅ Yes | ✅ Yes | High |
| **Local** | ✅ Complete | ✅ Yes | ✅ Yes | ✅ Yes | ✅ N/A | ✅ Yes | ✅ Yes | High |
| **Google** | ✅ Complete | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | High |
| **Facebook** | ❌ Incomplete | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | Medium |
| **GitHub** | ❌ Incomplete | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | Medium |
| **LinkedIn** | ❌ Incomplete | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | Low |
| **Microsoft** | ⚠️ Partial | ❌ No | ❌ No | ✅ Yes | ⚠️ Partial | ❌ No | ❌ No | Medium |
| **Okta** | ❌ Not Started | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | Low |

---

## Detailed Feature Analysis

### Core Features

| Feature | Anon | JWT | Local | Google | Facebook | GitHub | LinkedIn | Microsoft | Okta |
|---------|------|-----|-------|--------|----------|--------|----------|-----------|------|
| **Strategy Configuration** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| **PassReqToCallback** | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **User Service Integration** | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Find User by Email** | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create User** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Authentication Record** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Avatar Management** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Generate Login Token** | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Workflow Events** | N/A | ✅ | N/A | N/A | ❌ | ❌ | ❌ | ❌ | ❌ |

### OAuth Flow Features

| Feature | Google | Facebook | GitHub | LinkedIn | Microsoft | Okta |
|---------|--------|----------|--------|----------|-----------|------|
| **Start Endpoint** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Callback Endpoint** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Failure Endpoint** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **State Encoding** | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **State Validation** | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Session Management** | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Partner Resolution** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Success Redirect** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Failure Redirect** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Code Quality

| Feature | Anon | JWT | Local | Google | Facebook | GitHub | LinkedIn | Microsoft | Okta |
|---------|------|-----|-------|--------|----------|--------|----------|-----------|------|
| **TypeScript Types** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| **Error Handling** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Logging** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Environment Config** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| **Config Validation** | ✅ | ✅ | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Testing & Documentation

| Feature | Anon | JWT | Local | Google | Facebook | GitHub | LinkedIn | Microsoft | Okta |
|---------|------|-----|-------|--------|----------|--------|----------|-----------|------|
| **Unit Tests** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Integration Tests** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **README** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Flow Diagram** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Config Guide** | N/A | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Code Snippet Comparison

### Current Implementation Examples

#### ✅ Complete: Google Strategy (Callback)
```typescript
async (req, accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value;
  const userService = req.context.getService('core.UserService@1.0.0');
  
  let user = await userService.findUserWithEmail(email);
  if (!user) {
    user = await userService.createUser({
      email,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
    });
  }
  
  user.avatar = profile.photos?.[0]?.value;
  user.avatarProvider = 'google';
  
  const googleAuth = user.authentications.find(auth => auth.provider === 'google');
  if (!googleAuth) {
    user.authentications.push({
      provider: 'google',
      lastLogin: new Date(),
      props: { googleId, displayName, accessToken }
    });
  } else {
    googleAuth.lastLogin = new Date();
    googleAuth.props = { googleId, displayName, accessToken };
  }
  
  await user.save();
  const loginToken = await Helpers.generateLoginToken(user);
  return done(null, loginToken);
}
```

#### ❌ Incomplete: Facebook Strategy (Callback)
```typescript
(accessToken, refreshToken, profile, done) => {
  // Missing: passReqToCallback
  // Missing: context access
  // Missing: user service
  
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
  // Missing: database integration
  // Missing: authentication record
  // Missing: token generation
  
  return done(null, user); // Returns plain object, not proper format
});
```

#### ❌ Incomplete: GitHub Strategy (Callback)
```typescript
(accessToken, refreshToken, profile, done) => {
  // Missing: passReqToCallback
  // Missing: context access
  // Missing: user service
  
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
  // Missing: database integration
  // Missing: authentication record
  // Missing: token generation
  
  return done(null, user); // Returns plain object, not proper format
});
```

#### ❌ Incomplete: LinkedIn Strategy (Callback)
```typescript
(accessToken, refreshToken, profile, done) => {
  // Missing: passReqToCallback
  // Missing: context access
  // Missing: user service
  // WARNING: Using deprecated OAuth scopes (r_emailaddress, r_liteprofile)
  // Should use: openid, profile, email
  
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
  // Missing: database integration
  // Missing: authentication record
  // Missing: token generation
  
  return done(null, user); // Returns plain object, not proper format
});
```

#### ⚠️ Partial: Microsoft Strategy (Callback)
```typescript
(req, iss, sub, profile, jwtClaims, access_token, refresh_token, params, done) => {
  // HAS: passReqToCallback ✅
  // Missing: user service integration
  
  const email = profile._json.emails?.[0];
  const avatarUrl = profile._json.picture;

  const user = {
    email,
    avatarUrl,
    microsoftId: profile.oid,
    displayName: profile.displayName,
  };

  // TODO: Find or create the user in your database
  // Missing: database integration
  // Missing: authentication record
  // Missing: token generation
  // NOTE: Has 100+ lines of commented legacy code below
  
  return done(null, user); // Returns plain object, not proper format
});
```

---

## Environment Variables Comparison

| Variable | Anon | JWT | Local | Google | Facebook | GitHub | LinkedIn | Microsoft | Okta |
|----------|------|-----|-------|--------|----------|--------|----------|-----------|------|
| **Required Count** | 0 | 6 | 1 | 4 | 3 | 3 | 3 | 4 | 5 |
| **Has Defaults** | N/A | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| **Validation** | N/A | ✅ | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Documented** | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Google
```bash
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET
GOOLGE_CALLBACK_URL=http://localhost:4000/auth/google/callback
GOOGLE_OAUTH_SCOPE=openid email profile https://www.googleapis.com/auth/userinfo.profile
```

### Facebook
```bash
FACEBOOK_APP_ID=FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=FACEBOOK_APP_SECRET
FACEBOOK_APP_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
```
⚠️ **Issue:** Callback URL default uses port 3000, but Google uses 4000 (inconsistent)

### GitHub
```bash
GITHUB_CLIENT_ID=GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET
GITHUB_CLIENT_CALLBACK_URL=http://localhost:3000/auth/github/callback
```
⚠️ **Issue:** Callback URL default uses port 3000 (inconsistent with Google)

### LinkedIn
```bash
LINKEDIN_CLIENT_ID=LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET=LINKEDIN_CLIENT_SECRET
LINKEDIN_CALLBACK_URL=http://localhost:3000/auth/linkedin/callback
```
⚠️ **Issue:** Callback URL default uses port 3000 (inconsistent with Google)  
⚠️ **Issue:** Scopes in code use deprecated API v1 values

### Microsoft
```bash
MICROSOFT_CLIENT_ID=123456789
MICROSOFT_CLIENT_SECRET=12312312
MICROSOFT_TENANT_ID=asfadsf
# Also uses:
OAUTH_REDIRECT_URI=http://localhost:3000/auth/microsoft/openid/complete/
```
⚠️ **Issue:** Default values are obviously fake placeholders  
⚠️ **Issue:** Uses different port (3000) than Google (4000)  
⚠️ **Issue:** Uses separate OAUTH_REDIRECT_URI variable

### Okta (Not Yet Defined)
```bash
# To be determined - estimated:
OKTA_DOMAIN=dev-123456.okta.com
OKTA_CLIENT_ID=OKTA_CLIENT_ID
OKTA_CLIENT_SECRET=OKTA_CLIENT_SECRET
OKTA_CALLBACK_URL=http://localhost:4000/auth/okta/callback
OKTA_ISSUER=https://dev-123456.okta.com/oauth2/default
```

---

## Package Dependencies

| Strategy | Package | Version | Status | Notes |
|----------|---------|---------|--------|-------|
| Anon | passport | - | ✅ Installed | Core package |
| JWT | passport-jwt | - | ✅ Installed | Working |
| Local | passport-http | - | ✅ Installed | Working |
| Google | passport-google-oauth20 | - | ✅ Installed | Working |
| Facebook | passport-facebook | - | ✅ Installed | Ready to use |
| GitHub | passport-github | - | ✅ Installed | Ready to use |
| LinkedIn | passport-linkedin-oauth2 | - | ⚠️ Installed | May not support API v2 |
| Microsoft | passport-azure-ad | - | ✅ Installed | Uses OIDC strategy |
| Okta | **TBD** | - | ❌ Not installed | Need to research |

### Okta Package Options
1. `@okta/oidc-middleware` - Official Okta package
2. `passport-okta-oauth` - Community package
3. Generic OIDC strategy - Use passport-openidconnect with Okta config

**Recommendation:** Research needed to determine best option

---

## File Structure Comparison

```
strategies/
├── index.ts ...................... ✅ Strategy registration
├── helpers.ts .................... ✅ Shared utilities
├── AnonStrategy.ts ............... ✅ Complete (39 lines)
├── JWTStrategy.ts ................ ✅ Complete (69 lines)
├── LocalStrategy.ts .............. ✅ Complete (51 lines)
├── FacebookStrategy.ts ........... ❌ Incomplete (37 lines)
├── GithubStrategy.ts ............. ❌ Incomplete (39 lines)
├── LinkedInStrategy.ts ........... ❌ Incomplete (41 lines)
├── MicrosoftStrategy.ts .......... ⚠️ Partial (216 lines, 100+ commented)
├── google/
│   ├── GoogleStrategy.ts ......... ✅ Complete (173 lines)
│   ├── GoogleStrategy.spec.ts .... ✅ Tests (143 lines)
│   └── readme.md ................. ✅ Documentation
└── okta/
    └── (empty) ................... ❌ Not started
```

### Recommended Structure After Implementation

```
strategies/
├── index.ts
├── helpers.ts
├── AnonStrategy.ts
├── JWTStrategy.ts
├── LocalStrategy.ts
├── facebook/
│   ├── FacebookStrategy.ts
│   ├── FacebookStrategy.spec.ts
│   └── readme.md
├── github/
│   ├── GithubStrategy.ts
│   ├── GithubStrategy.spec.ts
│   └── readme.md
├── linkedin/
│   ├── LinkedInStrategy.ts
│   ├── LinkedInStrategy.spec.ts
│   └── readme.md
├── microsoft/
│   ├── MicrosoftStrategy.ts
│   ├── MicrosoftStrategy.spec.ts
│   └── readme.md
├── okta/
│   ├── OktaStrategy.ts
│   ├── OktaStrategy.spec.ts
│   └── readme.md
└── __tests__/
    ├── utils.ts (shared test utilities)
    └── integration.spec.ts
```

---

## Complexity Assessment

| Strategy | Lines of Code | Complexity | Special Considerations |
|----------|--------------|------------|----------------------|
| **Google** | 173 | Medium | ✅ Reference implementation |
| **Facebook** | 37 → ~150 | Low | Standard OAuth2 |
| **GitHub** | 39 → ~160 | Low | Standard OAuth2, includes username |
| **LinkedIn** | 41 → ~160 | Medium | API v2 migration needed |
| **Microsoft** | 216 → ~180 | High | Legacy code cleanup, OIDC, Graph API |
| **Okta** | 0 → ~170 | High | Full implementation, package research |

---

## Legend

- ✅ **Complete** - Fully implemented and working
- ⚠️ **Partial** - Some implementation exists but incomplete
- ❌ **Missing** - Not implemented
- N/A - Not applicable to this strategy

---

## Summary Statistics

### Overall Completion
- **Total Strategies:** 9
- **Complete:** 4 (44%)
- **Partial:** 1 (11%)
- **Incomplete:** 4 (45%)
- **Not Started:** 1 (11%)

### By Feature Type
- **Database Integration:** 4/9 (44%) complete
- **Token Generation:** 4/9 (44%) complete
- **Route Configuration:** 4/9 (44%) complete
- **State Management:** 2/9 (22%) complete
- **Tests:** 2/9 (22%) complete
- **Documentation:** 2/9 (22%) complete

### Effort Required
- **Total Estimated Hours:** 86-122
- **Average per Incomplete Strategy:** 10-15 hours
- **Infrastructure/Testing/Docs:** 26-32 hours
- **Timeline:** 5-9 weeks (part-time)

---

**Status Date:** November 21, 2025  
**Next Review:** After specification approval

