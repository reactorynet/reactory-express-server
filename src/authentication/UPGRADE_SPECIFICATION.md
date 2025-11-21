# Authentication Strategies Upgrade Specification

## Document Overview
This specification outlines the work required to complete the incomplete authentication strategies in the Reactory Express Server authentication module. The specification is based on a review of existing strategies, with working implementations (AnonStrategy, JWTStrategy, and GoogleStrategy) serving as reference patterns.

**Document Created:** November 21, 2025  
**Status:** Draft - Not Started  
**Priority:** High

---

## Executive Summary

The authentication module currently has **9 authentication strategies**, of which:
- ✅ **4 are complete and working**: Anon, JWT, Google, Local
- ⚠️ **4 are incomplete**: Facebook, GitHub, LinkedIn, Microsoft
- ❌ **1 is not implemented**: Okta

All incomplete strategies follow a similar pattern of missing implementation details, specifically:
1. Database user lookup/creation logic
2. Authentication record management
3. Route configuration and callbacks
4. State management for OAuth flows
5. JWT token generation
6. Error handling and logging
7. Test coverage
8. Documentation

---

## Reference Architecture

### Working Strategy Pattern (from GoogleStrategy)

The complete OAuth strategies should follow this pattern:

```typescript
// 1. Configuration from environment
const { PROVIDER_CLIENT_ID, PROVIDER_CLIENT_SECRET, PROVIDER_CALLBACK_URL } = process.env;

// 2. Strategy implementation with passReqToCallback
const Strategy = new ProviderStrategy({
  clientID: PROVIDER_CLIENT_ID,
  clientSecret: PROVIDER_CLIENT_SECRET,
  callbackURL: PROVIDER_CALLBACK_URL,
  passReqToCallback: true,
  scope: [...],
}, async (req, accessToken, refreshToken, profile, done) => {
  // 3. Extract user info from profile
  const email = profile.emails?.[0]?.value;
  
  // 4. Get services from context
  const userService = req.context.getService('core.UserService@1.0.0');
  
  // 5. State validation (OAuth flows)
  // Decode and validate session state
  
  // 6. Partner/Client resolution
  // Set context.partner from state or session
  
  // 7. User lookup or creation
  let user = await userService.findUserWithEmail(email);
  if (!user) {
    user = await userService.createUser({...});
  }
  
  // 8. Update authentication records
  user.authentications.push({
    provider: 'provider-name',
    lastLogin: new Date(),
    props: { ... }
  });
  
  // 9. Update avatar if available
  user.avatar = profile.photos?.[0]?.value;
  user.avatarProvider = 'provider-name';
  
  // 10. Save user
  await user.save();
  
  // 11. Generate login token
  const loginToken = await Helpers.generateLoginToken(user);
  
  // 12. Return token
  return done(null, loginToken);
});

// 13. Route configuration
export const useProviderRoutes = (app: Application) => {
  // Start endpoint - initiates OAuth flow
  app.get('/auth/provider/start', (req, res, next) => {
    // Encode state with client info
    const state = encoder.encodeState({...});
    req.session.authState = state;
    passport.authenticate('provider', { state, scope: [...] })(req, res, next);
  });
  
  // Callback endpoint - handles OAuth callback
  app.get('/auth/provider/callback', (req, res) => {
    passport.authenticate('provider', { 
      failureRedirect: '...',
      passReqToCallback: true,
    }, (err, user) => {
      if (err || !user) {
        // Handle failure
      } else {
        // Redirect with token
        res.redirect(`${partner.siteUrl}?auth_token=${user.token}`);
      }
    })(req, res);
  });
  
  // Failure endpoint
  app.get('/auth/provider/failure', (req, res) => {
    res.status(401).send({ error: '...' });
  });
};
```

### Key Helper Functions

All strategies should use these helper functions from `helpers.ts`:

```typescript
// Generate JWT token for user
Helpers.generateLoginToken(user, ip) => Promise<{
  id: string,
  firstName: string,
  lastName: string,
  token: string
}>

// Create JWT token
Helpers.jwtMake(payload) => string

// Create JWT payload for user
Helpers.jwtTokenForUser(user, options?) => object
```

---

## Strategy-Specific Upgrade Plans

### 1. FacebookStrategy

**Current Status:** Basic structure only, missing all core functionality

**Required Changes:**

#### 1.1 Update Strategy Implementation
- [ ] Add `passReqToCallback: true` to strategy options
- [ ] Implement complete callback handler:
  - [ ] Extract email and profile data
  - [ ] Get `UserService` from request context
  - [ ] Find or create user in database
  - [ ] Update/create authentication record with Facebook ID
  - [ ] Update user avatar from Facebook profile
  - [ ] Save user to database
  - [ ] Generate JWT login token
  - [ ] Add error handling and logging

#### 1.2 Route Configuration
- [ ] Create `useFacebookRoutes` function
- [ ] Implement `/auth/facebook/start` endpoint
  - [ ] State encoding with client credentials
  - [ ] Store state in session
  - [ ] Initiate passport authentication
- [ ] Implement `/auth/facebook/callback` endpoint
  - [ ] State validation
  - [ ] Partner resolution
  - [ ] Success/failure handling
  - [ ] Token-based redirect
- [ ] Implement `/auth/facebook/failure` endpoint

#### 1.3 Environment Configuration
- [ ] Document required environment variables in README
- [ ] Add validation for missing credentials
- [ ] Set appropriate default callback URL for development

#### 1.4 Testing
- [ ] Create test file `FacebookStrategy.spec.ts`
- [ ] Add unit tests for callback handler
- [ ] Add integration tests for OAuth flow
- [ ] Test user creation and lookup
- [ ] Test error scenarios

#### 1.5 Documentation
- [ ] Create `facebook/readme.md` with:
  - [ ] Flow diagram (mermaid)
  - [ ] Configuration instructions
  - [ ] Testing instructions
  - [ ] Troubleshooting guide

**Dependencies:**
- `passport-facebook` (already installed)
- User Service
- ReactoryClient model

**Estimated Effort:** 8-12 hours

---

### 2. GithubStrategy

**Current Status:** Basic structure only, missing all core functionality

**Required Changes:**

#### 2.1 Update Strategy Implementation
- [ ] Add `passReqToCallback: true` to strategy options
- [ ] Implement complete callback handler:
  - [ ] Extract email, username, and profile data
  - [ ] Get `UserService` from request context
  - [ ] Find or create user in database
  - [ ] Update/create authentication record with GitHub ID
  - [ ] Update user avatar from GitHub profile
  - [ ] Store GitHub username as additional metadata
  - [ ] Save user to database
  - [ ] Generate JWT login token
  - [ ] Add error handling and logging

#### 2.2 Route Configuration
- [ ] Create `useGithubRoutes` function
- [ ] Implement `/auth/github/start` endpoint
  - [ ] State encoding with client credentials
  - [ ] Store state in session
  - [ ] Set appropriate scopes (user:email, read:user)
  - [ ] Initiate passport authentication
- [ ] Implement `/auth/github/callback` endpoint
  - [ ] State validation
  - [ ] Partner resolution
  - [ ] Success/failure handling
  - [ ] Token-based redirect
- [ ] Implement `/auth/github/failure` endpoint

#### 2.3 Environment Configuration
- [ ] Document required environment variables in README
- [ ] Add validation for missing credentials
- [ ] Set appropriate default callback URL for development
- [ ] Document OAuth scope requirements

#### 2.4 Testing
- [ ] Create test file `GithubStrategy.spec.ts`
- [ ] Add unit tests for callback handler
- [ ] Add integration tests for OAuth flow
- [ ] Test user creation and lookup
- [ ] Test username handling
- [ ] Test error scenarios

#### 2.5 Documentation
- [ ] Create `github/readme.md` with:
  - [ ] Flow diagram (mermaid)
  - [ ] Configuration instructions (OAuth app setup)
  - [ ] Testing instructions
  - [ ] Troubleshooting guide

**Dependencies:**
- `passport-github` (already installed)
- User Service
- ReactoryClient model

**Estimated Effort:** 8-12 hours

---

### 3. LinkedInStrategy

**Current Status:** Basic structure only, missing all core functionality

**Required Changes:**

#### 3.1 Update Strategy Implementation
- [ ] Add `passReqToCallback: true` to strategy options
- [ ] Update OAuth scopes to current LinkedIn API v2 requirements
  - [ ] Replace deprecated scopes: `r_emailaddress`, `r_liteprofile`
  - [ ] Use new scopes: `openid`, `profile`, `email`
- [ ] Implement complete callback handler:
  - [ ] Extract email and profile data (note: LinkedIn v2 API format)
  - [ ] Get `UserService` from request context
  - [ ] Find or create user in database
  - [ ] Update/create authentication record with LinkedIn ID
  - [ ] Update user avatar from LinkedIn profile
  - [ ] Save user to database
  - [ ] Generate JWT login token
  - [ ] Add error handling and logging

#### 3.2 Route Configuration
- [ ] Create `useLinkedInRoutes` function
- [ ] Implement `/auth/linkedin/start` endpoint
  - [ ] State encoding with client credentials
  - [ ] Store state in session
  - [ ] Set updated OAuth scopes
  - [ ] Initiate passport authentication
- [ ] Implement `/auth/linkedin/callback` endpoint
  - [ ] State validation
  - [ ] Partner resolution
  - [ ] Success/failure handling
  - [ ] Token-based redirect
- [ ] Implement `/auth/linkedin/failure` endpoint

#### 3.3 Environment Configuration
- [ ] Document required environment variables in README
- [ ] Add validation for missing credentials
- [ ] Set appropriate default callback URL for development
- [ ] Document LinkedIn API v2 changes and requirements

#### 3.4 Testing
- [ ] Create test file `LinkedInStrategy.spec.ts`
- [ ] Add unit tests for callback handler
- [ ] Add integration tests for OAuth flow
- [ ] Test user creation and lookup
- [ ] Test LinkedIn v2 API response handling
- [ ] Test error scenarios

#### 3.5 Documentation
- [ ] Create `linkedin/readme.md` with:
  - [ ] Flow diagram (mermaid)
  - [ ] Configuration instructions (LinkedIn app setup)
  - [ ] API v2 migration notes
  - [ ] Testing instructions
  - [ ] Troubleshooting guide

**Dependencies:**
- `passport-linkedin-oauth2` (already installed)
- User Service
- ReactoryClient model

**Special Notes:**
- LinkedIn deprecated their v1 API and old OAuth scopes
- Need to verify `passport-linkedin-oauth2` package supports v2 API
- May need to switch to different passport strategy if package is outdated

**Estimated Effort:** 10-14 hours (includes API compatibility verification)

---

### 4. MicrosoftStrategy

**Current Status:** Partially complete - has routes but incomplete callback handler

**Required Changes:**

#### 4.1 Update Strategy Implementation
- [ ] Complete the callback handler implementation:
  - [ ] Extract email from Microsoft profile correctly
  - [ ] Get `UserService` from request context
  - [ ] Implement user lookup/creation logic
  - [ ] Update/create authentication record with Microsoft OID
  - [ ] Update user avatar from Microsoft Graph API
  - [ ] Save user to database
  - [ ] Generate JWT login token
  - [ ] Remove or integrate commented legacy code (lines 118-216)
- [ ] Add proper error handling throughout
- [ ] Add comprehensive logging

#### 4.2 Route Configuration Review
- [ ] Review existing `useMicrosoftRoutes` function
- [ ] Verify `/auth/microsoft/openid/start/:clientKey` endpoint
- [ ] Verify callback endpoint matches configuration
- [ ] Verify failure handling endpoint
- [ ] Add state management if missing
- [ ] Ensure consistent error responses

#### 4.3 Microsoft Graph Integration
- [ ] Determine if Graph API integration is needed (see commented code)
- [ ] If needed, implement avatar fetching from Graph API
- [ ] Add Graph API helper functions
- [ ] Document Graph API permissions required

#### 4.4 Environment Configuration
- [ ] Review and document required environment variables
- [ ] Add validation for missing credentials
- [ ] Update default values to be more obvious (currently using placeholder IDs)
- [ ] Document tenant configuration

#### 4.5 Testing
- [ ] Create test file `MicrosoftStrategy.spec.ts`
- [ ] Add unit tests for callback handler
- [ ] Add integration tests for OAuth flow
- [ ] Test multi-tenant scenarios
- [ ] Test Graph API integration (if implemented)
- [ ] Test error scenarios

#### 4.6 Code Cleanup
- [ ] Decide fate of commented code block (lines 118-216)
  - [ ] If useful, refactor and integrate
  - [ ] If obsolete, remove
- [ ] Ensure consistent code style with other strategies
- [ ] Add TypeScript types where `any` is used

#### 4.7 Documentation
- [ ] Create `microsoft/readme.md` with:
  - [ ] Flow diagram (mermaid)
  - [ ] Configuration instructions (Azure AD app setup)
  - [ ] Multi-tenant setup guide
  - [ ] Graph API integration details (if implemented)
  - [ ] Testing instructions
  - [ ] Troubleshooting guide

**Dependencies:**
- `passport-azure-ad` (already installed)
- User Service
- ReactoryClient model
- Microsoft Graph API (optional, depending on requirements)

**Special Notes:**
- Strategy uses OIDC (OpenID Connect) with Azure AD
- Large block of commented code suggests previous implementation
- Need to determine if Graph API integration is required or optional

**Estimated Effort:** 12-16 hours (includes legacy code review and potential Graph API integration)

---

### 5. OktaStrategy

**Current Status:** Not implemented - empty directory

**Required Changes:**

#### 5.1 Strategy Implementation
- [ ] Research and select appropriate passport strategy package
  - [ ] Option 1: `@okta/oidc-middleware` (official)
  - [ ] Option 2: `passport-okta-oauth` (community)
  - [ ] Option 3: Generic OIDC strategy with Okta configuration
- [ ] Install selected package
- [ ] Create `OktaStrategy.ts` file
- [ ] Implement strategy configuration:
  - [ ] Extract environment variables (issuer, clientId, clientSecret, etc.)
  - [ ] Configure OIDC/OAuth strategy
  - [ ] Set callback URL
  - [ ] Set appropriate scopes (openid, email, profile)
  - [ ] Enable `passReqToCallback`
- [ ] Implement callback handler:
  - [ ] Extract email and profile data from Okta claims
  - [ ] Get `UserService` from request context
  - [ ] Find or create user in database
  - [ ] Update/create authentication record with Okta user ID
  - [ ] Update user avatar if available
  - [ ] Save user to database
  - [ ] Generate JWT login token
  - [ ] Add error handling and logging

#### 5.2 Route Configuration
- [ ] Create `useOktaRoutes` function
- [ ] Implement `/auth/okta/start` endpoint
  - [ ] State encoding with client credentials
  - [ ] Store state in session
  - [ ] Set Okta-specific parameters
  - [ ] Initiate passport authentication
- [ ] Implement `/auth/okta/callback` endpoint
  - [ ] State validation
  - [ ] Partner resolution
  - [ ] Success/failure handling
  - [ ] Token-based redirect
- [ ] Implement `/auth/okta/failure` endpoint

#### 5.3 Strategy Registration
- [ ] Update `strategies/index.ts` to include Okta strategy:
  ```typescript
  import { default as OktaStrategy, useOktaRoutes } from './okta/OktaStrategy';
  
  // Add to PassportProviders array:
  {
    name: 'okta',
    strategy: OktaStrategy,
    configure: useOktaRoutes,
  }
  ```

#### 5.4 Environment Configuration
- [ ] Define required environment variables:
  - [ ] `OKTA_DOMAIN` - Okta domain (e.g., dev-123456.okta.com)
  - [ ] `OKTA_CLIENT_ID` - Application client ID
  - [ ] `OKTA_CLIENT_SECRET` - Application client secret
  - [ ] `OKTA_CALLBACK_URL` - Callback URL
  - [ ] `OKTA_ISSUER` - Optional issuer URL
- [ ] Add validation for missing credentials
- [ ] Set appropriate defaults for development

#### 5.5 Testing
- [ ] Create test file `OktaStrategy.spec.ts`
- [ ] Add unit tests for callback handler
- [ ] Add integration tests for OAuth flow
- [ ] Test user creation and lookup
- [ ] Test multi-tenant scenarios (if applicable)
- [ ] Test error scenarios

#### 5.6 Documentation
- [ ] Create `okta/readme.md` with:
  - [ ] Flow diagram (mermaid)
  - [ ] Okta application setup instructions
  - [ ] Configuration instructions
  - [ ] Environment variables documentation
  - [ ] Testing instructions
  - [ ] Troubleshooting guide
  - [ ] Comparison with other OIDC providers (Azure AD)

**Dependencies:**
- Okta passport package (TBD - needs research)
- User Service
- ReactoryClient model

**Special Notes:**
- Okta is an identity provider similar to Azure AD
- May have overlap with Microsoft strategy implementation
- Need to research best passport strategy for Okta
- Consider whether to support multiple Okta tenants

**Estimated Effort:** 14-20 hours (includes research and package selection)

---

## Cross-Cutting Concerns

### Security Enhancements

All strategies should implement these security best practices:

#### 1. State Parameter Validation
- [ ] Ensure all OAuth flows use state parameter
- [ ] Implement CSRF protection via state
- [ ] Add state timeout (prevent replay attacks)
- [ ] Log state validation failures

#### 2. Session Security
- [ ] Review session configuration
- [ ] Ensure secure session cookies
- [ ] Implement session timeout
- [ ] Clear sensitive data from session after auth

#### 3. Error Handling
- [ ] Never expose sensitive errors to client
- [ ] Log detailed errors server-side
- [ ] Return generic error messages
- [ ] Implement rate limiting on auth endpoints

#### 4. Token Security
- [ ] Validate JWT secret is set (not default)
- [ ] Implement token rotation
- [ ] Add token revocation mechanism
- [ ] Review token expiration settings

**Estimated Effort:** 8-12 hours across all strategies

---

### Testing Infrastructure

#### 1. Test Utilities
- [ ] Create shared test utilities in `strategies/__tests__/utils.ts`:
  - [ ] Mock request/response helpers
  - [ ] Mock user service
  - [ ] Mock passport authentication
  - [ ] Mock OAuth provider responses
  - [ ] State encoding/decoding test helpers

#### 2. Integration Test Suite
- [ ] Create integration test file `strategies/__tests__/integration.spec.ts`
- [ ] Test strategy registration and loading
- [ ] Test authentication flow coordination
- [ ] Test error propagation
- [ ] Test disabled provider handling

#### 3. Test Coverage
- [ ] Set minimum coverage threshold (80%)
- [ ] Configure Jest coverage reporting
- [ ] Add coverage badges to README
- [ ] Set up CI/CD coverage checks

**Estimated Effort:** 12-16 hours

---

### Documentation

#### 1. Main README
- [ ] Create `authentication/README.md` with:
  - [ ] Overview of authentication architecture
  - [ ] Strategy comparison table
  - [ ] Configuration guide
  - [ ] Development guide
  - [ ] Testing guide
  - [ ] Troubleshooting guide

#### 2. API Documentation
- [ ] Document all authentication endpoints
- [ ] Document request/response formats
- [ ] Document error codes
- [ ] Document state parameter format

#### 3. Environment Configuration
- [ ] Create `.env.example` with all auth variables
- [ ] Document each environment variable
- [ ] Provide development defaults
- [ ] Document production requirements

#### 4. Migration Guide
- [ ] Document upgrading from placeholder strategies
- [ ] Document breaking changes
- [ ] Provide migration scripts if needed

**Estimated Effort:** 8-12 hours

---

### Code Quality

#### 1. TypeScript Improvements
- [ ] Replace `any` types with proper interfaces
- [ ] Add missing type annotations
- [ ] Enable strict type checking for auth module
- [ ] Fix any TypeScript errors

#### 2. Linting
- [ ] Run ESLint on all strategy files
- [ ] Fix linting errors
- [ ] Add auth-specific linting rules
- [ ] Configure pre-commit hooks

#### 3. Code Organization
- [ ] Ensure consistent file structure across strategies
- [ ] Extract common code to shared utilities
- [ ] Review imports and dependencies
- [ ] Remove dead code

**Estimated Effort:** 6-8 hours

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish testing infrastructure and documentation foundation

1. Create test utilities and helpers
2. Set up test coverage reporting
3. Create main authentication README
4. Create `.env.example` with all variables
5. Implement security enhancements (state validation, error handling)

**Deliverables:**
- Test utility functions
- Coverage reporting configured
- Authentication README
- Security baseline implemented

**Estimated Effort:** 32-40 hours

---

### Phase 2: Complete Basic Strategies (Week 3-4)
**Goal:** Complete Facebook and GitHub strategies (simpler OAuth2 flows)

1. Implement FacebookStrategy
   - Complete callback handler
   - Add route configuration
   - Write tests
   - Write documentation
2. Implement GithubStrategy
   - Complete callback handler
   - Add route configuration
   - Write tests
   - Write documentation

**Deliverables:**
- Functional Facebook authentication
- Functional GitHub authentication
- Tests for both strategies
- Documentation for both strategies

**Estimated Effort:** 16-24 hours

---

### Phase 3: Complete Professional Strategies (Week 5-6)
**Goal:** Complete LinkedIn and fix Microsoft strategies

1. Update LinkedInStrategy
   - Research API v2 compatibility
   - Update scopes and implementation
   - Complete callback handler
   - Add route configuration
   - Write tests
   - Write documentation
2. Fix MicrosoftStrategy
   - Complete callback handler
   - Clean up legacy code
   - Review Graph API requirements
   - Write tests
   - Write documentation

**Deliverables:**
- Functional LinkedIn authentication
- Fully functional Microsoft authentication
- Tests for both strategies
- Documentation for both strategies

**Estimated Effort:** 22-30 hours

---

### Phase 4: Implement Okta (Week 7-8)
**Goal:** Implement Okta strategy from scratch

1. Research and select Okta passport package
2. Install dependencies
3. Implement OktaStrategy
4. Add route configuration
5. Update strategy index
6. Write tests
7. Write documentation

**Deliverables:**
- Functional Okta authentication
- Tests for Okta strategy
- Documentation for Okta strategy

**Estimated Effort:** 14-20 hours

---

### Phase 5: Polish and Finalization (Week 9)
**Goal:** Code quality, documentation, and final testing

1. TypeScript improvements across all strategies
2. Linting and code cleanup
3. Integration testing
4. Documentation review and completion
5. Create migration guide
6. Final security review

**Deliverables:**
- Clean, type-safe code
- Comprehensive documentation
- High test coverage
- Migration guide
- Security audit report

**Estimated Effort:** 14-20 hours

---

## Total Effort Estimation

| Phase | Estimated Hours | Estimated Weeks |
|-------|----------------|-----------------|
| Phase 1: Foundation | 32-40 | 1-2 |
| Phase 2: Basic Strategies | 16-24 | 1-2 |
| Phase 3: Professional Strategies | 22-30 | 1-2 |
| Phase 4: Okta Implementation | 14-20 | 1-2 |
| Phase 5: Polish | 14-20 | 1 |
| **Total** | **98-134** | **5-9** |

**Note:** Estimates assume one developer working full-time. Adjust for part-time work or multiple developers.

---

## Risk Assessment

### High Risks

1. **LinkedIn API Compatibility**
   - **Risk:** passport-linkedin-oauth2 may not support API v2
   - **Impact:** May need to switch packages or implement custom strategy
   - **Mitigation:** Research and verify package compatibility early in Phase 3

2. **Okta Package Selection**
   - **Risk:** Unclear which Okta passport package to use
   - **Impact:** May need to try multiple packages or implement custom OIDC
   - **Mitigation:** Research thoroughly in Phase 4 kickoff

3. **Microsoft Legacy Code**
   - **Risk:** Large commented code block suggests issues with original implementation
   - **Impact:** May encounter same issues; unclear if new approach will work
   - **Mitigation:** Review commented code carefully; test thoroughly; consult with original author if available

### Medium Risks

1. **Breaking Changes**
   - **Risk:** Completing strategies may change their behavior
   - **Impact:** Existing (incomplete) integrations may break
   - **Mitigation:** Document changes; provide migration guide; use feature flags

2. **Environment Configuration**
   - **Risk:** Each strategy requires external OAuth app setup
   - **Impact:** Testing and development may be blocked
   - **Mitigation:** Create development OAuth apps early; document setup clearly

3. **Test Coverage**
   - **Risk:** OAuth flows are difficult to unit test
   - **Impact:** May have lower coverage than desired
   - **Mitigation:** Focus on integration tests; use mocking extensively; accept lower unit test coverage for auth flows

### Low Risks

1. **Scope Creep**
   - **Risk:** May want to add additional features during implementation
   - **Impact:** Timeline extension
   - **Mitigation:** Stick to specification; document future enhancements separately

---

## Success Criteria

### Functional Requirements
- [ ] All 8 strategies (Anon, JWT, Local, Google, Facebook, GitHub, LinkedIn, Microsoft, Okta) are functional
- [ ] Each strategy can authenticate users successfully
- [ ] Users are created/updated in the database correctly
- [ ] JWT tokens are generated and returned
- [ ] All OAuth flows handle state correctly
- [ ] Errors are handled gracefully
- [ ] All strategies can be disabled via environment variable

### Quality Requirements
- [ ] Test coverage >80% for new/modified code
- [ ] All TypeScript errors resolved
- [ ] All linting errors resolved
- [ ] No security vulnerabilities introduced
- [ ] Code follows established patterns
- [ ] All code is properly documented

### Documentation Requirements
- [ ] Main authentication README complete
- [ ] Each strategy has its own README
- [ ] All environment variables documented
- [ ] API endpoints documented
- [ ] Migration guide available
- [ ] `.env.example` includes all auth variables

### Testing Requirements
- [ ] Unit tests for all callback handlers
- [ ] Integration tests for auth flows
- [ ] Error scenario tests
- [ ] Tests pass in CI/CD pipeline
- [ ] Manual testing completed for each strategy

---

## Post-Implementation Recommendations

### Monitoring & Observability
1. Add metrics for authentication events
   - Login attempts by provider
   - Success/failure rates
   - Token generation rates
   - Error rates by type
2. Add distributed tracing for auth flows
3. Set up alerts for authentication failures
4. Create authentication dashboard

### Security Hardening
1. Implement rate limiting per provider
2. Add brute force protection
3. Implement account lockout mechanism
4. Add suspicious activity detection
5. Regular security audits
6. Penetration testing

### Future Enhancements
1. Add SAML support for enterprise customers
2. Implement social login aggregation
3. Add multi-factor authentication (MFA)
4. Implement password-less authentication
5. Add biometric authentication support
6. Implement session management UI
7. Add authentication audit log

### Performance Optimization
1. Cache user lookups
2. Optimize database queries
3. Implement connection pooling for external services
4. Add CDN for OAuth callbacks
5. Optimize token generation

---

## Appendix

### A. Environment Variables Reference

```bash
# JWT Configuration
SECRET_SAUCE=your-jwt-secret
JWT_ISSUER=id.reactory.net
JWT_SUB=reactory-auth
JWT_AUD=app.reactory.net
JWT_EXP_AMOUNT=24
JWT_EXP_UNIT=h

# Authentication General
AUTH_REALM=Reactory
REACTORY_DISABLED_AUTH_PROVIDERS=facebook,linkedin  # Comma-separated list
REACTORY_APPLICATION_EMAIL=system@reactory.net

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOLGE_CALLBACK_URL=http://localhost:4000/auth/google/callback
GOOGLE_OAUTH_SCOPE=openid email profile https://www.googleapis.com/auth/userinfo.profile

# Facebook OAuth
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_APP_CALLBACK_URL=http://localhost:4000/auth/facebook/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_CALLBACK_URL=http://localhost:4000/auth/github/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:4000/auth/linkedin/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
OAUTH_REDIRECT_URI=http://localhost:4000/auth/microsoft/openid/complete/

# Okta OAuth (to be defined)
OKTA_DOMAIN=dev-123456.okta.com
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_CALLBACK_URL=http://localhost:4000/auth/okta/callback
OKTA_ISSUER=https://dev-123456.okta.com/oauth2/default
```

### B. Package Dependencies

Current dependencies:
- `passport` - Core passport library
- `passport-jwt` - JWT strategy
- `passport-http` - Basic auth strategy
- `passport-google-oauth20` - Google OAuth
- `passport-facebook` - Facebook OAuth
- `passport-github` - GitHub OAuth
- `passport-linkedin-oauth2` - LinkedIn OAuth
- `passport-azure-ad` - Microsoft OAuth

To be added:
- Okta passport package (TBD)

### C. Related Documentation
- [Passport.js Documentation](http://www.passportjs.org/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT RFC](https://tools.ietf.org/html/rfc7519)

### D. Contact Information
- **Document Owner:** [To be assigned]
- **Technical Lead:** [To be assigned]
- **Security Reviewer:** [To be assigned]

---

**End of Specification**

