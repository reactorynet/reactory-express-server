import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

/**
 * ORG-030: the seam between "an organization was just created" and "the base
 * demographic set exists".
 *
 * Every organization-creating path must leave the base set behind, but a
 * seeding problem must never fail the creation: a missing base set is
 * recoverable (`DemographicsService.backfillOrganizationDemographics` is
 * idempotent) while an organization that was half-created is not. This helper
 * is that policy in one place, so the two entry points - `OrganizationService`
 * (administrator create) and `UserService.selfRegister` (public
 * self-registration, which writes the organization model directly to bypass the
 * role-guarded service) - cannot drift apart.
 *
 * It never throws. The failure is logged at `warn` because silently creating a
 * tenant without the base set is exactly the defect this exists to prevent.
 * `DemographicsService.seedForOrganization` is itself idempotent, so callers may
 * invoke this more than once for the same organization.
 *
 * An **anonymous** context is a supported input, not an error: self-registration
 * has no `context.user` yet, and the seeder attributes nothing in that case
 * rather than refusing to seed (see `DemographicsService.resolveOptionalActorId`).
 */
const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

/**
 * Seeds the base demographic templates for `organizationId`.
 *
 * @param organizationId the organization that was just created; falsy is treated
 *        as a configuration error (warned, not thrown).
 * @param executionContext the caller's context. May be anonymous (`user: null`);
 *        the seed still runs, it is simply left unattributed.
 * @returns `true` when the seed ran, `false` when the service was unavailable
 *          or the seed failed. The boolean exists for tests and callers that
 *          want to log a summary; no caller should branch its own flow on it.
 */
export async function seedOrganizationDemographics(
  organizationId: string | null | undefined,
  executionContext?: Reactory.Server.IReactoryContext | null,
): Promise<boolean> {
  const id = organizationId === null || organizationId === undefined ? '' : `${organizationId}`;

  try {
    if (!id) {
      logger.warn(
        'The base demographics could not be seeded because no organization id was supplied',
      );
      return false;
    }

    const context: any = executionContext;
    const demographics: any = context && typeof context.getService === 'function'
      ? context.getService(DEMOGRAPHICS_SERVICE_ID)
      : null;

    if (!demographics || typeof demographics.seedForOrganization !== 'function') {
      logger.warn(
        `Demographics service [${DEMOGRAPHICS_SERVICE_ID}] is not available; organization [${id}] was created without the base demographic set`,
      );
      return false;
    }

    await demographics.seedForOrganization(id, { executionContext });
    return true;
  } catch (error: any) {
    logger.warn(
      `Seeding the base demographic templates for organization [${id}] failed: ${error?.message || error}`,
    );
    return false;
  }
}

export { DEMOGRAPHICS_SERVICE_ID };

export default seedOrganizationDemographics;
