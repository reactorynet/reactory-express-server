/**
 * Tenant scoping constants (WP-B2). Kept free of path aliases: entity files
 * import them, and the TypeORM CLI loads entities without the aliases.
 */
export const CLIENT_KEY_PROPERTY = 'clientKey';
export const CLIENT_KEY_COLUMN = 'client_key';
export const CROSS_TENANT_ROLE = 'CROSS_TENANT';
