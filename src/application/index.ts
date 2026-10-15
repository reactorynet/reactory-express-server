/**
 * Application registry.
 *
 * NOTE: the legacy `./admin` scaffold (the `System`/`User`/`Organization`
 * helpers) was removed together with the old generator stack (commit
 * e9da19eb) and its dependencies (`../../models`, `../../database`,
 * `../../exceptions`, ...) no longer exist, so it cannot be restored as-is.
 * The dead `import Admin from './admin'` was therefore dropped and `Admin`
 * is registered as an empty application definition until a replacement lands.
 */
const Admin = {};

export default {
  Admin,
};
