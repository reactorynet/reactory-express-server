/**
 * Application roles exposed by the Reactory management application.
 *
 * Every role listed here must be provided by the backend, i.e. declared on the
 * `roles` property of an activated module (or be one of the platform roles
 * ANON / USER / ADMIN / DEVELOPER). `SystemService.updateApplicationRoles`
 * rejects unknown roles and client seeding drops them, so an unsupported entry
 * is a configuration error rather than something that silently works.
 *
 * The authoritative list of available roles is the `ReactoryRoleCatalogue`
 * GraphQL query; the Application dashboard's Roles tab renders it grouped by
 * providing module.
 *
 * Reconciliation notes (2026-11-06):
 * - `WORKFLOW_MANAGER`  → `WORKFLOW_ADMIN`      (core/reactor: the role actually enforced)
 * - `SUPPORT_MANAGER`   → `SUPPORT_ADMIN`       (core: SUPPORT_ADMIN is the admin support tier)
 * - `BILLING_MANAGER`   → `FINANCE_MANAGER`     (reactory-payment)
 * - `CONTENT_MANAGER`   → removed               (no module provides it; reactory-kb uses USER/ADMIN)
 * - `APPLICATION_ADMIN` → removed               (no module provides it; ADMIN covers application administration)
 *
 * Further module-provided roles (BUSINESS_UNIT_ADMIN, TEAM_ADMIN, SYSADMIN,
 * FORM_DEVELOPER, ...) can be added from the catalogue when the application
 * needs to grant them.
 */
export default [
  // Platform roles — always provided.
  'USER',
  'ADMIN',
  'ANON',
  'DEVELOPER',
  // Provided by reactory-core.
  'ORGANIZATION_ADMIN',
  'WORKFLOW_ADMIN',
  'SUPPORT_ADMIN',
  // Provided by reactory-payment.
  'FINANCE_MANAGER',
];
