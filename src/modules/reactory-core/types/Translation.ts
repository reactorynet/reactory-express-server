import Reactory from '@reactorynet/reactory-core';

/**
 * Translation types local to the reactory-core server module.
 *
 * The published `@reactorynet/reactory-core` typings do not yet carry the
 * request-relevant language list, so this extends the published shape rather
 * than waiting on a package release. Once the package exposes it, this can
 * collapse back onto the base type.
 */
export interface ReactoryTranslations
  extends Reactory.Models.IReactoryTranslations {
  /**
   * Languages the server can serve — the locales present under
   * `REACTORY_DATA/i18n`. The client uses this instead of carrying its own
   * list, so adding a locale folder is enough to make it selectable.
   */
  languages?: string[];
}
