
/**
 * @file configBuilder.ts
 * @description Fluent builder and factory utilities for Reactory client configurations.
 *
 * Provides strongly-typed scaffold helpers for all major config sections:
 *   routes, menus, themes, auth providers, components, plugins, settings, and feature flags.
 *
 * Works alongside configLoader.ts (YAML-based) and configImportFactory.ts (code-based).
 *
 * ## Quick-start
 *
 * ```ts
 * import { ClientConfigBuilder, Presets } from './configBuilder';
 *
 * const config = new ClientConfigBuilder('my-app')
 *   .withName('My Application')
 *   .withCredentials('system', 'system@my-app.com')
 *   .withSiteUrl('https://my-app.reactory.net')
 *   .withEmailConfig('sendgrid', process.env.SENDGRID_API_KEY!)
 *   .withRoles('USER', 'ADMIN', 'ANON')
 *   .withRoutes(...Presets.routes.default())
 *   .withMenus(Presets.menus.profileSmall())
 *   .withTheme('reactory', Presets.themes.material('reactory'))
 *   .withAuth(Presets.auth.local())
 *   .withPlugins(Presets.plugins.clientCore())
 *   .build();
 * ```
 */

import Reactory from '@reactorynet/reactory-core';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';
import {
  loginroute,
  forgotpasswordroute,
  resetpasswordroute,
  logoutroute,
  sendlinkroute,
  notfoundroute,
  formsroute,
  presetSimple,
  presetMicrosoftLoginOnly,
} from './defaultRoutes';
import { profileSmall, MenuItems } from './menus';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function randomId(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
}

// ---------------------------------------------------------------------------
// Preset Factories
// ---------------------------------------------------------------------------

/**
 * Material UI palette definition used inside themeOptions.
 */
export interface MaterialPalette {
  primary?: {
    light?: string;
    main: string;
    dark?: string;
    contrastText?: string;
  };
  secondary?: {
    light?: string;
    main: string;
    dark?: string;
    contrastText?: string;
  };
  [key: string]: unknown;
}

/**
 * Theme option shape used by the Reactory client.
 * Stored alongside the IReactoryClientConfig.
 */
export interface ReactoryThemeOptions {
  type: 'material' | 'bootstrap';
  palette: MaterialPalette;
  assets: {
    featureImage: string;
    logo: string;
    favicon: string;
    [key: string]: string;
  };
  content: {
    appTitle: string;
    login?: {
      message?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Preset factories for the most common configuration building blocks.
 *
 * Access via:
 * - `Presets.routes.*`
 * - `Presets.menus.*`
 * - `Presets.themes.*`
 * - `Presets.auth.*`
 * - `Presets.plugins.*`
 * - `Presets.settings.*`
 * - `Presets.featureFlags.*`
 */
export const Presets = {
  /**
   * Route presets — all return arrays ready for `.withRoutes(...spread)`.
   */
  routes: {
    /** Full default set: login, forgot, reset, send-link, logout, not-found, forms */
    default: () => [
      loginroute,
      forgotpasswordroute,
      resetpasswordroute,
      sendlinkroute,
      logoutroute,
      notfoundroute,
      formsroute,
    ],
    /** Minimal auth set: login, forgot, reset */
    simple: () => [...presetSimple],
    /** Microsoft-SSO login only */
    microsoftOnly: () => [...presetMicrosoftLoginOnly],
    /** Single custom route shorthand */
    route: (
      key: string,
      title: string,
      path: string,
      componentFqn: string,
      options: Partial<{
        public: boolean;
        exact: boolean;
        roles: string[];
        args: unknown[];
        id: string;
      }> = {},
    ) => ({
      id: options.id ?? key,
      key,
      title,
      path,
      public: options.public ?? false,
      exact: options.exact ?? true,
      roles: options.roles ?? ['USER'],
      componentFqn,
      ...(options.args ? { args: options.args } : {}),
    }),
  },

  /**
   * Menu presets.
   */
  menus: {
    /** Standard top-right profile menu (profile, signin, signout) */
    profileSmall: () => ({ ...profileSmall }),
    /** Left navigation drawer scaffold */
    leftNav: (
      entries: Array<{
        ordinal: number;
        title: string;
        link: string;
        icon: string;
        roles: string[];
      }>,
      roles: string[] = ['USER'],
    ) => ({
      name: 'Main',
      key: 'left-nav',
      target: 'left-nav',
      roles,
      entries,
    }),
    /** A single reusable menu entry */
    entry: (
      ordinal: number,
      title: string,
      link: string,
      icon: string,
      roles: string[] = ['USER'],
    ) => ({ ordinal, title, link, icon, roles }),
    MenuItems,
  },

  /**
   * Theme presets.
   */
  themes: {
    /**
     * Standard Material UI theme options scaffolded around a CDN-hosted asset set.
     * @param themeKey - the folder name under themes/ in the CDN
     * @param palette  - optional palette overrides
     * @param appTitle - human-readable app title
     */
    material: (
      themeKey: string,
      palette: MaterialPalette = {
        primary: { light: '#6d6d6d', main: '#424242', dark: '#1b1b1b', contrastText: '#ffffff' },
        secondary: { light: '#ff9e40', main: '#ff6d00', dark: '#c43c00', contrastText: '#fff' },
      },
      appTitle = 'My Reactory App',
    ): ReactoryThemeOptions => ({
      type: 'material',
      palette,
      assets: {
        featureImage: safeCDNUrl(`themes/${themeKey}/images/feature.png`),
        logo: safeCDNUrl(`themes/${themeKey}/images/logo.png`),
        favicon: safeCDNUrl(`themes/${themeKey}/images/favicon.png`),
      },
      content: {
        appTitle,
        login: { message: 'Built With Reactory' },
      },
    }),
  },

  /**
   * Authentication provider presets.
   */
  auth: {
    local: (enabled = true): Reactory.Server.IReactoryAuthConfiguration<unknown> => ({
      provider: 'LOCAL',
      enabled,
      options: {},
    }),
    google: (enabled = false, options: unknown = {}): Reactory.Server.IReactoryAuthConfiguration<unknown> => ({
      provider: 'GOOGLE',
      enabled,
      options,
    }),
    facebook: (enabled = false, options: unknown = {}): Reactory.Server.IReactoryAuthConfiguration<unknown> => ({
      provider: 'FACEBOOK',
      enabled,
      options,
    }),
    microsoft: (enabled = false, options: unknown = {}): Reactory.Server.IReactoryAuthConfiguration<unknown> => ({
      provider: 'MICROSOFT',
      enabled,
      options,
    }),
    /** Convenience: all providers disabled except local */
    localOnly: (): Reactory.Server.IReactoryAuthConfiguration<unknown>[] => [
      Presets.auth.local(true),
      Presets.auth.google(false),
      Presets.auth.facebook(false),
      Presets.auth.microsoft(false),
    ],
  },

  /**
   * Plugin presets.
   */
  plugins: {
    /**
     * Reactory Client Core plugin.
     * @param version - plugin version (default: '1.0.0')
     */
    clientCore: (version = '1.0.0'): Reactory.Platform.IReactoryApplicationPlugin => ({
      id: 'reactory-client-core',
      nameSpace: 'core',
      name: 'reactory-client-core',
      description: 'Reactory Client Core Plugin',
      version,
      enabled: true,
      roles: ['USER', 'ANON'],
      platform: 'web',
      mimeType: 'application/javascript',
      uri: safeCDNUrl(`plugins/reactory-client-core/lib/reactory.client.core.js`),
    }),
    /** Ad-hoc plugin shorthand */
    plugin: (
      id: string,
      nameSpace: string,
      name: string,
      uri: string,
      options: Partial<Reactory.Platform.IReactoryApplicationPlugin> = {},
    ): Reactory.Platform.IReactoryApplicationPlugin => ({
      id,
      nameSpace,
      name,
      description: options.description ?? '',
      version: options.version ?? '1.0.0',
      enabled: options.enabled ?? true,
      roles: options.roles ?? ['USER'],
      platform: options.platform ?? 'web',
      mimeType: options.mimeType ?? 'application/javascript',
      uri,
    }),
  },

  /**
   * Setting presets.
   */
  settings: {
    /** Default new-user roles setting */
    newUserRoles: (roles: string[] = ['USER']): Reactory.Server.IReactoryClientSetting<string[]> => ({
      name: 'new_user_roles',
      componentFqn: 'core.Setting@1.0.0',
      formSchema: {
        type: 'string',
        title: 'Default User Role',
        description: 'The default user role to assign to a new user',
      },
      data: roles,
    }),
    /** Ad-hoc setting shorthand */
    setting: <T = unknown>(
      name: string,
      data: T,
      componentFqn = 'core.Setting@1.0.0',
      formSchema: Record<string, unknown> & { type: string } = { type: 'object' },
    ): Reactory.Server.IReactoryClientSetting<T> => ({
      name,
      componentFqn,
      formSchema,
      data,
    }),
  },

  /**
   * Feature flag presets.
   */
  featureFlags: {
    flag: <T = boolean>(
      feature: string,
      value: T,
      roles: string[] = ['USER'],
    ): Reactory.Server.IReactoryFeatureFlagValue<T> => ({
      feature,
      value,
      roles,
    }),
  },
} as const;

// ---------------------------------------------------------------------------
// ClientConfigBuilder — fluent API
// ---------------------------------------------------------------------------

/**
 * Fluent builder for `Reactory.Server.IReactoryClientConfig`.
 *
 * All `with*` methods return `this` and are safe to chain.
 * Call `.build()` to obtain the final config object.
 *
 * @example
 * ```ts
 * const config = new ClientConfigBuilder('my-app')
 *   .withName('My App')
 *   .withCredentials('system', 'system@my-app.com')
 *   .withSiteUrl('https://my-app.reactory.net')
 *   .withRoutes(...Presets.routes.default())
 *   .withAuth(...Presets.auth.localOnly())
 *   .withPlugins(Presets.plugins.clientCore())
 *   .build();
 * ```
 */
export class ClientConfigBuilder {
  private _config: Partial<Reactory.Server.IReactoryClientConfig> & { themeOptions?: ReactoryThemeOptions };

  constructor(key: string) {
    this._config = {
      key,
      salt: 'generate',
      password: randomId(20),
      applicationRoles: ['USER', 'ANON'],
      billingType: 'free',
      menus: [],
      routes: [],
      components: [],
      plugins: [],
      settings: [],
      featureFlags: [],
      whitelist: [],
      auth_config: [],
      allowCustomTheme: false,
    };
  }

  withKey(key: string): this {
    this._config.key = key;
    return this;
  }

  withName(name: string): this {
    this._config.name = name;
    return this;
  }

  /** Set the system application user credentials. Password defaults to a random value. */
  withCredentials(username: string, email: string, password?: string, salt = 'generate'): this {
    this._config.username = username;
    this._config.email = email;
    this._config.salt = salt;
    if (password) this._config.password = password;
    return this;
  }

  withSiteUrl(siteUrl: string): this {
    this._config.siteUrl = siteUrl;
    return this;
  }

  withAvatar(urlOrThemeKey: string, isThemeKey = false): this {
    this._config.avatar = isThemeKey
      ? safeCDNUrl(`themes/${urlOrThemeKey}/images/avatar.png`)
      : urlOrThemeKey;
    return this;
  }

  withEmailConfig(sendVia: string, apiKey: string, resetRoute = '/forgot-password'): this {
    this._config.emailSendVia = sendVia;
    this._config.emailApiKey = apiKey;
    this._config.resetEmailRoute = resetRoute;
    return this;
  }

  withRoles(...roles: string[]): this {
    this._config.applicationRoles = roles;
    return this;
  }

  withRoutes(...routes: unknown[]): this {
    this._config.routes = [...(this._config.routes ?? []), ...routes];
    return this;
  }

  /** Replace all routes (useful when loading from YAML) */
  setRoutes(routes: unknown[]): this {
    this._config.routes = routes;
    return this;
  }

  withMenus(...menus: Reactory.UX.IReactoryMenuConfig[]): this {
    this._config.menus = [...(this._config.menus ?? []), ...menus];
    return this;
  }

  /** Set the active theme key */
  withTheme(theme: string, themeOptions?: ReactoryThemeOptions): this {
    this._config.theme = theme;
    if (themeOptions) (this._config as Record<string, unknown>).themeOptions = themeOptions;
    return this;
  }

  withThemes(...themes: Reactory.UX.IReactoryTheme[]): this {
    this._config.themes = [...(this._config.themes ?? []), ...themes];
    return this;
  }

  withAuth(...providers: Reactory.Server.IReactoryAuthConfiguration<unknown>[]): this {
    this._config.auth_config = [...(this._config.auth_config ?? []), ...providers];
    return this;
  }

  withComponents(...components: unknown[]): this {
    this._config.components = [...(this._config.components ?? []), ...components];
    return this;
  }

  withPlugins(...plugins: Reactory.Platform.IReactoryApplicationPlugin[]): this {
    this._config.plugins = [...(this._config.plugins ?? []), ...plugins];
    return this;
  }

  withSettings(...settings: Reactory.Server.IReactoryClientSetting<unknown>[]): this {
    this._config.settings = [...(this._config.settings ?? []), ...settings];
    return this;
  }

  withFeatureFlags(...flags: Reactory.Server.IReactoryFeatureFlagValue<unknown>[]): this {
    this._config.featureFlags = [...(this._config.featureFlags ?? []), ...flags];
    return this;
  }

  withWhitelist(...domains: string[]): this {
    this._config.whitelist = [...(this._config.whitelist ?? []), ...domains];
    return this;
  }

  withBillingType(billingType: string): this {
    this._config.billingType = billingType;
    return this;
  }

  withUsers(...users: Reactory.Server.IStaticallyLoadedUser[]): this {
    this._config.users = [...(this._config.users ?? []), ...users];
    return this;
  }

  withAllowCustomTheme(allow: boolean): this {
    this._config.allowCustomTheme = allow;
    return this;
  }

  /** Deep-merge an arbitrary partial config (YAML-loaded objects, etc.) */
  merge(partial: Partial<Reactory.Server.IReactoryClientConfig>): this {
    this._config = { ...this._config, ...partial };
    return this;
  }

  /**
   * Finalise and return the `IReactoryClientConfig`.
   * @throws if required fields (key, name, email, siteUrl) are missing.
   */
  build(): Reactory.Server.IReactoryClientConfig {
    const required: Array<keyof Reactory.Server.IReactoryClientConfig> = [
      'key', 'name', 'email', 'siteUrl',
    ];
    for (const field of required) {
      if (!this._config[field]) {
        throw new Error(`ClientConfigBuilder: missing required field "${field}"`);
      }
    }
    // Ensure username has a sensible default
    if (!this._config.username) this._config.username = this._config.key;
    // Ensure avatar has a sensible default
    if (!this._config.avatar) {
      this._config.avatar = safeCDNUrl(`themes/${this._config.key}/images/avatar.png`);
    }
    return this._config as Reactory.Server.IReactoryClientConfig;
  }
}

// ---------------------------------------------------------------------------
// Legacy / convenience factory functions
// ---------------------------------------------------------------------------

/**
 * Resolve a site URL from the current `MODE` environment variable.
 *
 * Falls back to `http://localhost:3000` when MODE is absent or unrecognised.
 */
export function resolveSiteUrl(key: string): string {
  const { MODE } = process.env;
  switch (MODE) {
    case 'QA':
      return `https://${key}-app.reactory.net`;
    case 'PRODUCTION':
      return `https://${key}.reactory.net`;
    default:
      return 'http://localhost:3000';
  }
}

/**
 * Backwards-compatible factory that mirrors the original `makeConfig` signature.
 *
 * Builds a baseline Reactory client config and deep-merges `props` over it.
 * Prefer `ClientConfigBuilder` for new configurations.
 *
 * @param key   - Client key (e.g. `'my-app'`)
 * @param props - Any overrides / additions to the base config
 */
const makeConfig = (
  key: string,
  props: Partial<Reactory.Server.IReactoryClientConfig> & { themeOptions?: ReactoryThemeOptions },
): Reactory.Server.IReactoryClientConfig & { themeOptions?: ReactoryThemeOptions } => {
  const base = new ClientConfigBuilder(key)
    .withName(props.name ?? 'My New Application')
    .withCredentials(
      props.username ?? key,
      props.email ?? `system@${key}.reactory.net`,
      props.password,
    )
    .withSiteUrl(props.siteUrl ?? resolveSiteUrl(key))
    .withEmailConfig(
      props.emailSendVia ?? 'sendgrid',
      props.emailApiKey ?? process.env.SENDGRID_API_KEY ?? '',
      props.resetEmailRoute ?? '/forgot-password',
    )
    .withRoles(...(props.applicationRoles ?? ['USER', 'ADMIN', 'ANON']))
    .withRoutes(...(Array.isArray(props.routes) ? props.routes : Presets.routes.default()))
    .withMenus(Presets.menus.profileSmall())
    .withTheme(props.theme ?? key, props.themeOptions ?? Presets.themes.material(key))
    .withAuth(...Presets.auth.localOnly())
    .withSettings(Presets.settings.newUserRoles())
    .withWhitelist('localhost', 'app.reactory.net', 'reactory.net')
    .withBillingType(props.billingType ?? 'partner')
    .withAllowCustomTheme(props.allowCustomTheme ?? true)
    .withAvatar(key, true)
    .build();

  // Strip fields already in base to avoid duplication, then spread remaining props
  const {
    key: _k, name: _n, username: _u, email: _e, password: _p, siteUrl: _s,
    emailSendVia: _ev, emailApiKey: _ea, resetEmailRoute: _re,
    applicationRoles: _ar, routes: _r, menus: _m, theme: _t, auth_config: _ac,
    settings: _st, whitelist: _w, billingType: _bt, allowCustomTheme: _act,
    themeOptions: _to, avatar: _av,
    ...rest
  } = props;

  return { ...base, ...rest } as Reactory.Server.IReactoryClientConfig & { themeOptions?: ReactoryThemeOptions };
};

export default makeConfig;
