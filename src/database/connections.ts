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
