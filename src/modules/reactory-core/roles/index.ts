import Reactory from '@reactorynet/reactory-core';

/**
 * @module reactory-core/roles
 *
 * Backend role catalogue.
 *
 * Roles in Reactory are provided by the modules that are activated on the
 * server: a module declares the roles it uses for access control on
 * {@link Reactory.Server.IReactoryModule.roles}. The catalogue is the single
 * source of truth for "which roles does this backend actually provide", and it
 * is what the application administration UI uses to decide whether an
 * application's `applicationRoles` are valid.
 *
 * The catalogue is derived at request time from `context.modules`, so it always
 * reflects the modules that are actually loaded rather than a hand-maintained
 * list that can drift.
 *
 * Two role sets are provided by the platform itself and are therefore always
 * available regardless of which modules are loaded:
 *
 * - **platform roles** — the core Reactory roles (`ANON`, `USER`, `ADMIN`,
 *   `DEVELOPER`). Every application must expose at least `ANON` and `USER`.
 * - **system roles** — internal elevation roles (`SYSTEM`) used by service
 *   accounts and background work. They are provided by the backend and are
 *   therefore valid, but they are not meant to be exposed as application roles;
 *   the UI flags them separately.
 */

/**
 * The roles the platform provides regardless of which modules are activated.
 * Mirrors {@link Reactory.REACTORY_CORE_ROLES}.
 */
export const REACTORY_PLATFORM_ROLES: string[] = ['ANON', 'USER', 'ADMIN', 'DEVELOPER'];

/**
 * Internal elevation roles that the backend provides but that should not be
 * exposed as application roles.
 */
export const REACTORY_SYSTEM_ROLES: string[] = ['SYSTEM'];

/**
 * A module role group in the catalogue. One group per module that provides at
 * least one role of its own (i.e. beyond the platform baseline).
 */
export interface IReactoryRoleGroup {
  /** Stable identifier for the group — the module id or its FQN. */
  id: string;
  nameSpace: string;
  name: string;
  version: string;
  description?: string;
  priority: number;
  /** True for the core module, which the platform treats specially. */
  isCore: boolean;
  /** Roles contributed by this module alone, sorted alphabetically. */
  roles: string[];
}

/**
 * The complete role catalogue for a backend instance.
 */
export interface IReactoryRoleCatalogue {
  /**
   * Every role the backend accepts as an application role: platform roles plus
   * every role contributed by a module. Sorted, distinct.
   */
  roles: string[];
  /** Platform-provided core roles. Always assignable. */
  platformRoles: string[];
  /** Internal system elevation roles. Valid but flagged as internal. */
  systemRoles: string[];
  /** Module role groups, core module first, then by priority and name. */
  modules: IReactoryRoleGroup[];
}

const normaliseRole = (role: unknown): string | null => {
  if (typeof role !== 'string') return null;
  const trimmed = role.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normaliseRoleList = (roles?: string[] | null): string[] => {
  if (!Array.isArray(roles)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const role of roles) {
    const normalised = normaliseRole(role);
    if (normalised && !seen.has(normalised)) {
      seen.add(normalised);
      result.push(normalised);
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
};

/**
 * Builds the role catalogue for the given module set.
 *
 * Roles that a module declares but that are already provided by the platform
 * (`ANON`, `USER`, `ADMIN`, `DEVELOPER`, `SYSTEM`) are not repeated in that
 * module's group — they are reported once under `platformRoles` /
 * `systemRoles` so the operator sees each role exactly once. A module that only
 * uses platform roles contributes no group.
 *
 * @param modules the activated modules for the current context
 */
export const buildRoleCatalogue = (
  modules: Reactory.Server.IReactoryModule[] | null | undefined,
): IReactoryRoleCatalogue => {
  const platformRoles = [...REACTORY_PLATFORM_ROLES];
  const systemRoles = [...REACTORY_SYSTEM_ROLES];
  const reserved = new Set<string>([...platformRoles, ...systemRoles]);

  const groups: IReactoryRoleGroup[] = [];
  const allRoles = new Set<string>([...platformRoles, ...systemRoles]);

  for (const module of Array.isArray(modules) ? modules : []) {
    if (!module) continue;

    const declared = normaliseRoleList(module.roles);
    const distinctive = declared.filter((role) => !reserved.has(role));

    if (distinctive.length === 0) continue;

    distinctive.forEach((role) => allRoles.add(role));

    const nameSpace = module.nameSpace ?? '';
    const name = module.name ?? '';
    const version = module.version ?? '';
    const id =
      module.id ||
      (nameSpace && name
        ? `${nameSpace}.${name}${version ? `@${version}` : ''}`
        : name || nameSpace);

    groups.push({
      id,
      nameSpace,
      name,
      version,
      description: module.description,
      priority: typeof module.priority === 'number' ? module.priority : 100,
      isCore: id === 'reactory-core' || (nameSpace === 'core' && name === 'ReactoryServer'),
      roles: distinctive,
    });
  }

  groups.sort((a, b) => {
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aName = `${a.nameSpace}.${a.name}`;
    const bName = `${b.nameSpace}.${b.name}`;
    return aName.localeCompare(bName);
  });

  return {
    roles: Array.from(allRoles).sort((a, b) => a.localeCompare(b)),
    platformRoles: [...platformRoles].sort((a, b) => a.localeCompare(b)),
    systemRoles: [...systemRoles].sort((a, b) => a.localeCompare(b)),
    modules: groups,
  };
};

/**
 * Returns the roles that a given role set does not cover, i.e. roles an
 * application asks for that no module (or the platform) provides.
 *
 * Comparison is exact after normalisation; role names are case sensitive by
 * convention (they are upper snake case).
 */
export const findUnknownRoles = (
  requested: string[],
  catalogue: IReactoryRoleCatalogue,
): string[] => {
  const available = new Set<string>(catalogue.roles);
  return normaliseRoleList(requested).filter((role) => !available.has(role));
};

/** Deduplicates and sorts a role list without dropping unknown values. */
export const normaliseRoles = (roles?: string[] | null): string[] => normaliseRoleList(roles);

export default buildRoleCatalogue;
