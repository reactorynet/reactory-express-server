import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Subresource Integrity for scripts the client loads from the CDN (WP-C4).
 *
 * The client used to inject plugin and form-module scripts by `src` alone,
 * so whoever could change a file on the CDN path could run code in every
 * tenant's browser. The client now sets `integrity` when the server supplies
 * one, and the browser refuses a file whose hash differs.
 *
 * The hash is of the file this server's `/cdn` route serves
 * (`APP_DATA_ROOT` + the path after `CDN_ROOT`), so it only describes what
 * the browser receives when `CDN_ROOT` is served from here.
 * REACTORY_PLUGIN_SRI decides:
 *   auto (default) hash when CDN_ROOT has the same origin as API_URI_ROOT
 *   on             always hash the local file (a CDN kept in step with it)
 *   off            never
 * A plugin hosted elsewhere can carry an explicit `integrity` on its record.
 */
type Env = Record<string, string | undefined>;

export type SriMode = 'auto' | 'on' | 'off';

export const sriMode = (env: Env = process.env): SriMode => {
  const value = (env.REACTORY_PLUGIN_SRI || 'auto').trim().toLowerCase();
  return value === 'on' || value === 'off' ? value : 'auto';
};

const origin = (url: string | undefined): string | null => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};

/** The file behind a CDN URI, or null when the URI is not on this CDN or escapes it. */
export const localCdnFile = (uri: string, env: Env = process.env): string | null => {
  const cdnRoot = (env.CDN_ROOT || 'http://localhost:4000/cdn').replace(/\/+$/, '');
  const dataRoot = env.APP_DATA_ROOT;
  if (!uri || !dataRoot || !uri.startsWith(`${cdnRoot}/`)) return null;

  let relative: string;
  try {
    relative = decodeURIComponent(uri.slice(cdnRoot.length + 1).split(/[?#]/)[0]);
  } catch {
    return null;
  }
  const root = path.resolve(dataRoot);
  const file = path.resolve(root, relative);
  return file.startsWith(`${root}${path.sep}`) ? file : null;
};

const cache = new Map<string, { mtimeMs: number; size: number; integrity: string }>();

/** `sha384-<base64>` of a file, cached until its mtime or size changes. */
export const integrityForFile = (file: string): string | null => {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const cached = cache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.integrity;

  const integrity = `sha384-${crypto.createHash('sha384').update(fs.readFileSync(file)).digest('base64')}`;
  cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, integrity });
  return integrity;
};

/** The integrity for a script URI, or null when none can be vouched for. */
export const integrityForCdnUri = (uri: string | undefined, env: Env = process.env): string | null => {
  if (!uri) return null;
  const mode = sriMode(env);
  if (mode === 'off') return null;
  if (mode === 'auto') {
    const cdnOrigin = origin(env.CDN_ROOT || 'http://localhost:4000/cdn');
    if (!cdnOrigin || cdnOrigin !== origin(env.API_URI_ROOT)) return null;
  }
  const file = localCdnFile(uri, env);
  return file ? integrityForFile(file) : null;
};
