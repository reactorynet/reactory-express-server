import Reactory from '@reactorynet/reactory-core';
import ApiError from '@reactory/server-core/exceptions';
import { IDatabaseConnectionSettings, ReactoryDatabaseVariant } from './types';

export const SUPPORTED_VARIANTS: ReactoryDatabaseVariant[] = [
  'mongo',
  'mysql',
  'postgres',
  'mssql',
  'databricks',
];

/**
 * Variants that speak SQL and can therefore be used by the SQL Query Editor.
 * Document stores (mongo) and key-value stores (redis) are surfaced through
 * their own editors, not this list.
 */
export const SQL_VARIANTS: ReactoryDatabaseVariant[] = [
  'postgres',
  'mysql',
  'mssql',
  'databricks',
];

/**
 * A safe connection descriptor for UI consumption (select options, pickers).
 * Deliberately excludes credentials — never widen this without a security review.
 */
export interface IListedDatabaseConnection {
  /** Setting name; the value passed to resolvers/macros as `connectionId`. */
  connectionId: string;
  /** Database variant backing the connection. */
  variant: ReactoryDatabaseVariant;
  /** Human readable display name for pickers. Falls back to the setting name. */
  label: string;
  /** Human readable title from the setting, if authored. */
  title?: string;
  /** Host address. */
  host?: string;
  /** Port number. */
  port?: number;
  /** Database / catalog name. */
  database?: string;
  /** Optional descriptive label. */
  description?: string;
  /** Roles required to use the connection (empty/undefined = open). */
  roles?: string[];
}

type PartnerConnectionSetting = {
  name?: string;
  title?: string;
  type?: string;
  settingType?: string;
  variant?: string;
  description?: string;
  roles?: string[];
  data?: Partial<IDatabaseConnectionSettings>;
};

/**
 * A connection setting is any client setting whose `settingType` (or legacy
 * `type`) is `connection`. Shared by `resolveConnectionSettings` and
 * `listConnectionSettings` so read and list agree on what a connection is.
 */
export const isConnectionSetting = (setting: PartnerConnectionSetting): boolean =>
  setting?.settingType === 'connection' || setting?.type === 'connection';

/**
 * Resolve the variant of a connection setting. The variant may be declared on
 * the setting itself or inside its `data` block; `data` wins when both exist.
 */
export const resolveSettingVariant = (
  setting: PartnerConnectionSetting,
): ReactoryDatabaseVariant | undefined =>
  (setting?.data?.variant ?? setting?.variant) as ReactoryDatabaseVariant | undefined;

/**
 * Lists the database connections available to the caller, resolved from the
 * active partner's settings.
 *
 * Security behaviour (identical to the reactory-reactor AI data macro
 * `listDataConnections`, so the SQL editor and the agent tool surface the same
 * set):
 *  - A setting with a non-empty `roles` array is only listed when the caller
 *    holds at least one of those roles.
 *  - If the caller's roles cannot be evaluated, a role-protected setting is
 *    denied rather than exposed.
 *
 * Returns an empty array (never throws) when there is no active partner — a
 * picker rendering zero options is preferable to a hard failure.
 *
 * @param context Active request context.
 * @param variants Optional allow-list of variants to include. Defaults to all
 *                 supported variants; pass `SQL_VARIANTS` for SQL-only editors.
 */
export const listConnectionSettings = (
  context: Reactory.Server.IReactoryContext,
  variants?: ReactoryDatabaseVariant[],
): IListedDatabaseConnection[] => {
  const settings = (context as unknown as { partner?: { settings?: unknown } })?.partner?.settings;

  if (!Array.isArray(settings)) return [];

  // An omitted allow-list means "all supported variants"; an explicitly empty
  // one means "none" — fail closed rather than silently widening the result.
  const allowed = new Set<ReactoryDatabaseVariant>(
    variants === undefined ? SUPPORTED_VARIANTS : variants,
  );

  const callerHoldsAnyRole = (roles: string[]): boolean => {
    try {
      const hasAnyRole = (context as unknown as { hasAnyRole?: (r: string[]) => boolean })?.hasAnyRole;
      if (typeof hasAnyRole !== 'function') return false;
      return hasAnyRole.call(context, roles) === true;
    } catch {
      return false;
    }
  };

  return (settings as PartnerConnectionSetting[])
    .filter((setting) => isConnectionSetting(setting))
    .filter((setting) => {
      const variant = resolveSettingVariant(setting);
      return Boolean(setting?.name) && variant !== undefined && allowed.has(variant);
    })
    .filter((setting) => {
      const roles = Array.isArray(setting.roles)
        ? setting.roles.filter((role) => typeof role === 'string' && role.trim().length > 0)
        : [];

      if (roles.length === 0) return true;

      return callerHoldsAnyRole(roles);
    })
    .map((setting) => {
      const data = setting.data ?? {};

      return {
        connectionId: setting.name as string,
        variant: resolveSettingVariant(setting) as ReactoryDatabaseVariant,
        label: setting.title || (setting.name as string),
        title: setting.title,
        host: data.host,
        port: data.port !== undefined ? parseInt(`${data.port}`, 10) : undefined,
        database: data.database,
        description: setting.description,
        roles: setting.roles,
      };
    });
};

/**
 * Resolves a database connection from the active partner's settings.
 *
 * A connection setting is any client setting whose `settingType` (or legacy
 * `type`) is `connection`, with the variant declared either on the setting
 * itself or inside its `data` block — the same resolution rules used by the
 * reactory-reactor AI data macros (`ai/macro/data/utils.ts`), so connections
 * configured once in a client config work for services, resolvers, workflows
 * and AI tools alike.
 */
export const resolveConnectionSettings = (
  connectionId: string,
  context: Reactory.Server.IReactoryContext,
  expectedVariant?: ReactoryDatabaseVariant,
): IDatabaseConnectionSettings => {
  if (!context || !context.partner) {
    throw new ApiError('Cannot resolve a database connection without an active partner');
  }

  const setting: any = context.partner.getSetting(connectionId);
  if (!setting || !setting.data) {
    throw new ApiError(
      `Connection settings not found for '${connectionId}'. Please check client settings for ${context.partner.name} (key ${context.partner.key})`,
    );
  }

  const data = setting.data as Partial<IDatabaseConnectionSettings> & { user?: string };
  const variant = (data.variant ?? setting.variant) as ReactoryDatabaseVariant | undefined;

  if (!variant || SUPPORTED_VARIANTS.indexOf(variant) === -1) {
    throw new ApiError(
      `Connection '${connectionId}' has a missing or unsupported variant '${variant}'. Supported variants: ${SUPPORTED_VARIANTS.join(', ')}`,
    );
  }

  if (expectedVariant && variant !== expectedVariant) {
    throw new ApiError(
      `Connection '${connectionId}' is a '${variant}' connection, expected '${expectedVariant}'`,
    );
  }

  return {
    ...data,
    // legacy mysql settings use `user` instead of `username`
    username: data.username ?? data.user,
    // YAML env interpolation (${VAR:default}) produces strings — drivers want numbers
    port: data.port !== undefined ? parseInt(`${data.port}`, 10) : undefined,
    variant,
  };
};
