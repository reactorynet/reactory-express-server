# Authentication Environment Variables

This file documents all environment variables required for the Reactory authentication module.

## Critical Security Note

**Never commit actual credentials to version control!** Use this as a reference to create your `.env` file.

---

## Quick Setup

Copy the variables you need to your `.env` file and update with your actual credentials.

---

## JWT Configuration

### Required

```bash
# CRITICAL: Set a strong, randomly generated secret key
# Generate with: openssl rand -base64 32
SECRET_SAUCE=your-secure-jwt-secret-key-change-this-in-production
```

### Optional (with defaults)

```bash
# JWT Token Claims
JWT_ISSUER=id.yourapp.com              # Default: id.reactory.net
JWT_SUB=yourapp-auth                   # Default: reactory-auth
JWT_AUD=app.yourapp.com                # Default: app.reactory.net

# JWT Token Expiration
JWT_EXP_AMOUNT=24                      # Default: 24
JWT_EXP_UNIT=h                         # Default: h (h=hours, d=days, m=minutes)
```

---

## General Authentication

```bash
# HTTP Basic Auth Realm (for Local strategy)
AUTH_REALM=Reactory

# System/Application User Email (required for OAuth flows)
REACTORY_APPLICATION_EMAIL=system@yourapp.com

# Disable specific providers (comma-separated, leave empty to enable all)
# Example: facebook,linkedin,github
REACTORY_DISABLED_AUTH_PROVIDERS=
```

---

## Google OAuth2

**Setup**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOLGE_CALLBACK_URL=http://localhost:4000/auth/google/callback
GOOGLE_OAUTH_SCOPE=openid email profile https://www.googleapis.com/auth/userinfo.profile
```

**Production:**
```bash
GOOLGE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

---

## Facebook OAuth2

**Setup**: [Facebook Developers](https://developers.facebook.com/apps/)

```bash
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_APP_CALLBACK_URL=http://localhost:4000/auth/facebook/callback
```

**Production:**
```bash
FACEBOOK_APP_CALLBACK_URL=https://yourdomain.com/auth/facebook/callback
```

---

## GitHub OAuth

**Setup**: [GitHub Developer Settings](https://github.com/settings/applications/new)

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CLIENT_CALLBACK_URL=http://localhost:4000/auth/github/callback
```

**Production:**
```bash
GITHUB_CLIENT_CALLBACK_URL=https://yourdomain.com/auth/github/callback
```

---

## LinkedIn OAuth2

**Setup**: [LinkedIn Developers](https://www.linkedin.com/developers/apps/new)

**Note**: LinkedIn migrated to v2 API. Use scopes: `openid, profile, email`

```bash
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:4000/auth/linkedin/callback
```

**Production:**
```bash
LINKEDIN_CALLBACK_URL=https://yourdomain.com/auth/linkedin/callback
```

---

## Microsoft OAuth (Azure AD)

**Setup**: [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)

```bash
MICROSOFT_CLIENT_ID=your-azure-application-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
OAUTH_REDIRECT_URI=http://localhost:4000/auth/microsoft/openid/complete/
```

**Production:**
```bash
MICROSOFT_TENANT_ID=common  # For multi-tenant apps
OAUTH_REDIRECT_URI=https://yourdomain.com/auth/microsoft/openid/complete/
```

**Optional (Graph API):**
```bash
OAUTH_AUTHORITY=https://login.microsoftonline.com/
OAUTH_ID_METADATA=v2.0/.well-known/openid-configuration
OAUTH_AUTHORIZE_ENDPOINT=/oauth2/v2.0/authorize
OAUTH_TOKEN_ENDPOINT=/oauth2/v2.0/token
OAUTH_SCOPES=openid profile email User.Read
```

---

## Okta SSO

**Setup**: [Okta Developer](https://developer.okta.com/)

```bash
OKTA_DOMAIN=dev-123456.okta.com
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_CALLBACK_URL=http://localhost:4000/auth/okta/callback
OKTA_ISSUER=https://dev-123456.okta.com/oauth2/default
```

**Production:**
```bash
OKTA_DOMAIN=yourcompany.okta.com
OKTA_ISSUER=https://yourcompany.okta.com/oauth2/default
OKTA_CALLBACK_URL=https://yourdomain.com/auth/okta/callback
```

---

## Port Standardization

All callbacks use **port 4000** by default. If your app runs on a different port, update all callback URLs.

**Example for port 3000:**
```bash
GOOLGE_CALLBACK_URL=http://localhost:3000/auth/google/callback
FACEBOOK_APP_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
GITHUB_CLIENT_CALLBACK_URL=http://localhost:3000/auth/github/callback
# ... etc
```

---

## Development vs Production

### Development (localhost)
- ✅ Use `http://` for local development
- ✅ Callbacks point to `localhost:4000`
- ✅ Use test/sandbox provider accounts
- ✅ Enable debug logging

### Production
- ⚠️ **MUST use `https://`** for all callbacks
- ⚠️ Update all callbacks to your domain
- ⚠️ Use production OAuth credentials
- ⚠️ Set secure, random JWT secret
- ⚠️ Disable unnecessary providers
- ⚠️ Enable rate limiting
- ⚠️ Configure session security
- ⚠️ Set up monitoring

---

## Security Checklist

Before production deployment:

- [ ] Change `SECRET_SAUCE` to strong random value
- [ ] Update all callback URLs to use HTTPS
- [ ] Set `REACTORY_APPLICATION_EMAIL` to valid system account
- [ ] Disable unused providers
- [ ] Verify OAuth apps configured for production domains
- [ ] Enable rate limiting
- [ ] Configure secure session cookies
- [ ] Set up monitoring and alerting
- [ ] Test all auth flows in production-like environment
- [ ] Review JWT expiration settings
- [ ] Enable audit logging

---

## Testing Configuration

For tests, use mock values:

```bash
SECRET_SAUCE=test-jwt-secret-for-development-only
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-secret
# Tests use mocked services - real credentials not required
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "JWT Secret not set" | Ensure `SECRET_SAUCE` is set to non-default value |
| OAuth callback fails | Verify callback URL matches exactly in provider settings |
| Strategy not loading | Check `REACTORY_DISABLED_AUTH_PROVIDERS` |
| User not created | Verify `REACTORY_APPLICATION_EMAIL` is set |

See [README.md](./README.md) for comprehensive troubleshooting guide.

---

## Provider Setup Guides

- **Google**: https://console.cloud.google.com/apis/credentials
- **Facebook**: https://developers.facebook.com/docs/facebook-login
- **GitHub**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **LinkedIn**: https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication
- **Microsoft**: https://docs.microsoft.com/en-us/azure/active-directory/develop/
- **Okta**: https://developer.okta.com/docs/guides/sign-into-web-app/

---

## Additional Resources

- [Main Authentication README](./README.md)
- [Google Strategy Docs](./strategies/google/readme.md)
- [Upgrade Specification](./UPGRADE_SPECIFICATION.md)
- [Progress Tracker](./PROGRESS_TRACKER.md)

