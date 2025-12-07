# ReactoryClient Model

> **Core Platform Model** - Multi-tenant client/partner configuration and authentication

## Overview

The ReactoryClient model is the cornerstone of Reactory's multi-tenant architecture, representing individual clients, partners, or white-labeled instances of the platform. Each ReactoryClient defines a complete tenant configuration including authentication, routes, menus, components, themes, and application-specific settings.

**Key Concept:** The model is often referred to as "partner" in the execution context and is available via `context.partner` throughout the application.

---

## 🎯 Purpose

The ReactoryClient model enables:

- ✅ **Multi-Tenant Architecture** - Isolated configurations for multiple clients on a single platform
- 🔐 **Client Authentication** - Secure credential-based access control via API key and password
- 🎨 **Theme Management** - Custom themes, color schemes, and branding per client
- 🧭 **Route Configuration** - Client-specific routing with role-based access
- 📋 **Menu Management** - Dynamic menu structures per client
- 🔌 **Component Registry** - Client-specific component availability
- ⚙️ **Settings Management** - Flexible key-value configuration system
- 📧 **Email Configuration** - Per-client email delivery settings
- 🔒 **Authentication Providers** - Configurable OAuth/SSO providers per client
- 🔧 **Plugin System** - Client-specific application plugins

---

## 📊 Data Model

### Core Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | String | Unique lowercase identifier (indexed, unique) |
| `name` | String | Display name |
| `email` | String | Contact email |
| `password` | String | Hashed password (PBKDF2 + SHA-512) |
| `salt` | String | Password salt (16 bytes) |
| `siteUrl` | String | Client website URL |
| `avatar` | String | Avatar/logo image URL |
| `theme` | String | Active theme identifier |
| `mode` | String | Theme mode (light/dark) |
| `themes` | Array | Available theme configurations |
| `applicationRoles` | String[] | Available roles for this client |
| `routes` | Object[] | Route definitions (embedded) |
| `menus` | ObjectId[] | Menu references |
| `components` | ObjectId[] | Component references |
| `auth_config` | Object[] | Authentication provider configs |
| `settings` | Object[] | Key-value settings |
| `whitelist` | String[] | IP whitelist (CIDR notation) |
| `plugins` | Object[] | Application plugins |
| `emailSendVia` | String | Email provider (sendgrid, ses, etc) |
| `emailApiKey` | String | Email service API key |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Route Structure

Routes are embedded documents with the following structure:

```typescript
interface IReactoryRoute {
  key: string;                    // Unique route identifier
  title: string;                  // Human-readable title
  path: string;                   // URL path (supports :params)
  public: boolean;                // Public access flag
  roles: string[];                // Required roles
  exact: boolean;                 // Exact path matching
  redirect?: string;              // Redirect target
  componentFqn: string;           // Component fully qualified name
  args?: IKeyValuePair[];         // Component arguments
  componentProps?: object;        // Component properties
}
```

---

## 🔧 Instance Methods

### Password Management

```typescript
// Set client password (PBKDF2 with SHA-512, 1000 iterations, 16-byte salt)
reactoryClient.setPassword(password: string): void

// Validate client password against stored hash
reactoryClient.validatePassword(password: string): boolean
```

### Settings Management

```typescript
// Get client setting with optional default and auto-creation
reactoryClient.getSetting<T>(
  name: string,
  defaultValue?: T,
  create?: boolean,
  componentFqn?: string
): { data: T }
```

**Example:**
```typescript
const { data: roles } = client.getSetting<string[]>('NEW_USER_ROLES', ['USER'], true);
const { data: maxSize } = client.getSetting<number>('MAX_FILE_SIZE', 10485760);
```

### Role Management

```typescript
// Get default roles for new users (from settings or defaults to ['USER'])
reactoryClient.getDefaultUserRoles(): string[]
```

### Theme & Color Schemes

```typescript
// Generate triade color scheme from base color
reactoryClient.colorScheme(colorvalue?: string): string[]
```

---

## 🚀 Static Methods

### Configuration Upsert

```typescript
/**
 * Comprehensive upsert from configuration file
 * Handles routes, menus, components, users, and more
 */
ReactoryClient.upsertFromConfig(
  clientConfig: Partial<IReactoryClient>,
  context?: IReactoryContext
): Promise<ReactoryClientDocument>
```

**Features:**
- ✅ Deep route synchronization with change detection
- ✅ Menu upsert with conflict resolution
- ✅ Component installation/update
- ✅ Default user creation with organizations/teams
- ✅ Password management
- ✅ Comprehensive error handling
- ✅ Full telemetry integration
- ✅ Detailed operation logging

📖 **See:** [UPSERT_DOCUMENTATION.md](./UPSERT_DOCUMENTATION.md) for complete details

### Startup Process

```typescript
/**
 * Load and configure all clients at server startup
 */
ReactoryClient.onStartup(
  context: IReactoryContext
): Promise<{
  clientsLoaded: ReactoryClientDocument[];
  clientsFailed: Array<{ clientConfig: any; error: any }>;
}>
```

**Process:**
1. Load configurations from `/data/clientConfigs/`
2. Install components per client
3. Comprehensive upsert with route/menu sync
4. Set passwords
5. Create default users
6. Track all with telemetry

---

## 🔐 Authentication

### Middleware Integration

ReactoryClient integrates with Express middleware for request authentication:

```typescript
// Credential extraction (priority order)
1. Headers: x-client-key, x-client-pwd
2. Query parameters: ?x-client-key=...&x-client-pwd=...
3. Session storage: req.session['x-client-key']

// Authentication flow
1. Extract credentials
2. Check 5-minute in-memory cache
3. Query database if cache miss
4. Validate password with PBKDF2
5. Cache valid client
6. Attach to request: req.partner = client
7. Attach to context: context.partner = client
```

### Credential Formats

```bash
# Header-based (recommended)
curl -H "x-client-key: my-client" \
     -H "x-client-pwd: secret123" \
     https://api.example.com/graphql

# Query-based (fallback for OAuth callbacks)
https://api.example.com/auth/callback?x-client-key=my-client&x-client-pwd=secret123
```

### Bypass URIs

Static content and development endpoints bypass authentication:
- `/cdn/content/`, `/cdn/plugins/`, `/cdn/themes/`, `/cdn/ui/`
- `/favicon.ico`
- `/swagger`, `/telemetry/metrics`, `/telemetry/health` (dev only)

---

## ⚙️ Configuration Management

### File Structure

```
data/clientConfigs/
├── __index.ts                    # Auto-generated (server startup)
├── enabled-clients.json          # Activation list
├── helpers/
│   ├── configBuilder.ts          # Config utilities
│   ├── defaultRoutes.ts          # Common routes
│   └── menus.ts                  # Default menus
└── my-client/                    # Client folder
    ├── index.ts                  # Main config
    ├── routes/index.ts           # Routes
    ├── menus/index.ts            # Menus
    ├── components/index.ts       # Components
    └── users/index.ts            # Default users
```

### Example Configuration

```typescript
// data/clientConfigs/my-client/index.ts
import routes from './routes';
import menus from './menus';

const config: Reactory.Server.IReactoryClientConfig = {
  key: 'my-client',
  name: 'My Client Application',
  email: 'admin@my-client.com',
  password: 'initial-password',
  siteUrl: 'https://my-client.com',
  
  // Theme
  theme: 'default',
  mode: 'light',
  
  // Roles
  applicationRoles: ['USER', 'ADMIN', 'MANAGER'],
  
  // Routes
  routes: routes,
  
  // Menus
  menus: menus,
  
  // Auth providers
  auth_config: [
    {
      provider: 'local',
      enabled: true,
      properties: {},
    },
    {
      provider: 'google',
      enabled: true,
      properties: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    },
  ],
  
  // Settings
  settings: [
    {
      name: 'NEW_USER_ROLES',
      data: ['USER'],
      title: 'Default User Roles',
    },
  ],
  
  // Email
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
};

export default config;
```

---

## 📡 API Integration

### GraphQL Access

```typescript
// Resolver access
const resolver = {
  Query: {
    myQuery: async (parent, args, context: Reactory.Server.IReactoryContext) => {
      const { partner } = context;
      
      // Use client properties
      const clientName = partner.name;
      const { data: setting } = partner.getSetting('MY_SETTING', 'default');
      
      return processQuery(args, partner);
    },
  },
};
```

### REST API Access

```typescript
// Express route
app.post('/api/upload', async (req: Reactory.Server.ReactoryExpressRequest, res) => {
  const { partner } = req;
  
  const { data: maxSize } = partner.getSetting('MAX_FILE_SIZE', 10485760);
  
  if (req.file.size > maxSize) {
    return res.status(413).json({ error: 'File too large', maxSize });
  }
  
  const result = await handleUpload(req.file, partner);
  res.json(result);
});
```

### Service Layer

```typescript
class MyService implements Reactory.Service.IReactoryService {
  context: Reactory.Server.IReactoryContext;
  
  async performAction(input: any) {
    const { partner } = this.context;
    
    const { data: enabled } = partner.getSetting('FEATURE_ENABLED', false);
    if (!enabled) throw new Error('Feature not enabled');
    
    return this.processAction(input, partner);
  }
}
```

---

## 📊 Telemetry & Monitoring

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `client_config_upsert_total` | Counter | Total upserts |
| `client_config_upsert_duration_seconds` | Histogram | Upsert duration |
| `client_config_upsert_errors_total` | Counter | Upsert errors |
| `client_route_sync_total` | Counter | Route syncs |
| `client_route_sync_duration_seconds` | Histogram | Route sync duration |
| `client_route_sync_errors_total` | Counter | Route sync errors |
| `client_menu_sync_total` | Counter | Menu syncs |
| `client_menu_sync_errors_total` | Counter | Menu errors |
| `client_component_install_total` | Counter | Component installs |
| `client_component_install_duration_seconds` | Histogram | Install duration |
| `client_user_creation_total` | Counter | Users created |
| `client_user_creation_errors_total` | Counter | User errors |

### Querying Metrics

```bash
# All client metrics
curl http://localhost:9090/metrics | grep client_

# Specific client
curl http://localhost:9090/metrics | grep 'clientKey="my-client"'

# Errors only
curl http://localhost:9090/metrics | grep _errors_total
```

---

## 🔍 Common Use Cases

### 1. Multi-Tenant SaaS

Each tenant gets isolated configuration:
- Routes and navigation
- Branding and themes
- User management
- Feature flags
- Email settings

### 2. White-Label Applications

Same codebase, different brands:
```typescript
const brands = [
  { key: 'brand-a', theme: 'brand-a-theme', siteUrl: 'https://brand-a.com' },
  { key: 'brand-b', theme: 'brand-b-theme', siteUrl: 'https://brand-b.com' },
];
```

### 3. Feature Flags

```typescript
// Client A: All features
settings: [
  { name: 'ADVANCED_REPORTING', data: true },
  { name: 'AI_ASSISTANT', data: true },
]

// Client B: Basic features
settings: [
  { name: 'ADVANCED_REPORTING', data: false },
  { name: 'AI_ASSISTANT', data: false },
]
```

### 4. Role-Based Access

```typescript
routes: [
  { path: '/dashboard', roles: ['USER'] },        // All users
  { path: '/admin', roles: ['ADMIN'] },           // Admins only
  { path: '/audit', roles: ['AUDITOR', 'ADMIN'] },// Auditors + Admins
]
```

---

## 🚨 Troubleshooting

### Authentication Issues (401 errors)

```bash
# Verify client exists
db.reactory_clients.findOne({ key: "my-client" })

# Check logs
grep "ReactoryClientAuthenticationMiddleware" server.log

# Verify credentials format
# Headers: x-client-key, x-client-pwd
```

### Routes Not Updating

```bash
# Check config
grep -A 5 "routes:" data/clientConfigs/my-client/index.ts

# Check startup logs
grep "Route synchronization" server.log

# Verify in database
db.reactory_clients.findOne({ key: "my-client" }, { routes: 1 })
```

### Settings Not Persisting

```typescript
// Ensure save is awaited
const { data } = client.getSetting('MY_SETTING', 'default', true);
await client.save(); // Important!

// Check validation
const result = client.validateSync();
console.log(result?.errors);
```

---

## 🎯 Best Practices

### Configuration Management

```typescript
// ✅ DO: Use environment variables
password: process.env.CLIENT_PASSWORD,
emailApiKey: process.env.SENDGRID_API_KEY,

// ❌ DON'T: Hardcode secrets
password: 'mysecret123',
emailApiKey: 'SG.abc123...',
```

### Route Organization

```typescript
// ✅ DO: Clear, descriptive keys
{ key: 'user-profile-edit', path: '/profile/:userId/edit' }

// ❌ DON'T: Unclear abbreviations
{ key: 'up_e', path: '/p/:id/e' }
```

### Settings Constants

```typescript
// ✅ DO: Define constants
const SETTINGS = {
  NEW_USER_ROLES: 'NEW_USER_ROLES',
  MAX_FILE_SIZE: 'MAX_FILE_UPLOAD_SIZE',
};

const { data } = partner.getSetting(SETTINGS.NEW_USER_ROLES, ['USER']);
```

---

## 📈 Performance Tips

### Database Optimization

```typescript
// Add indexes
db.reactory_clients.createIndex({ key: 1 }, { unique: true });
db.reactory_clients.createIndex({ email: 1 });

// Use projection
ReactoryClient.findOne({ key: clientId })
  .select('key name theme routes menus')
  .lean();
```

### Caching

- Client cache: 5-minute TTL (automatic)
- In-memory storage for single instance
- Consider Redis for multi-instance deployments

### Lazy Loading

```typescript
// Load client without populating everything
const client = await ReactoryClient.findOne({ key }).lean();

// Populate on demand
if (needMenus) await client.populate('menus');
if (needComponents) await client.populate('components');
```

---

## 📚 Additional Documentation

### Core Documentation
- **[UPSERT_DOCUMENTATION.md](./UPSERT_DOCUMENTATION.md)** - Comprehensive upsert guide
- **[CHANGELOG.md](./CHANGELOG.md)** - Recent changes
- [schema.ts](./schema.ts) - Mongoose schema
- [statics.ts](./statics.ts) - Static methods
- [methods.ts](./methods.ts) - Instance methods
- [types.ts](./types.ts) - TypeScript types

### Related Documentation
- Client Configuration: `/data/clientConfigs/readme.md`
- Authentication: `/authentication/readme.md`
- Middleware: `/express/middleware/readme.md`
- Telemetry: `/modules/reactory-telemetry/readme.md`

---

## 🔒 Security

- ✅ PBKDF2 password hashing (1000 iterations, SHA-512)
- ✅ 16-byte random salts
- ✅ 64-byte derived keys
- ✅ Passwords never logged or stored plain
- ✅ 5-minute credential cache
- ✅ Optional IP whitelisting
- ✅ Role-based route access
- ✅ Environment variable configuration

---

## 🤝 Contributing

1. **Schema Changes**: Update `schema.ts`
2. **Methods**: Add to `methods.ts` or `statics.ts`
3. **Types**: Update type definitions
4. **Documentation**: Update this README
5. **Tests**: Add test coverage
6. **Telemetry**: Add relevant metrics

---

**Version**: 2.0.0  
**Last Updated**: November 30, 2024  
**Status**: ✅ Production Ready with Comprehensive Route Synchronization  