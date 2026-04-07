import crypto from 'crypto';
//@ts-ignore
import ColorScheme from 'color-scheme';
import { find, isNil } from 'lodash';
import ReactoryConstants from '@reactory/server-core/constants';
import logger from '@reactory/server-core/logging';


const setPassword = function setPassword(password: string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

const getDefaultUserRoles = function getDefaultUserRoles() {
  const model: Reactory.Models.IReactoryClient = this as Reactory.Models.IReactoryClient;
  if(!model) throw new Error('No model bound to method');

  if (Array.isArray(model.settings) === true && model.settings.length > 0) {
    const setting = model.settings.find((setting) => {
      return setting.name === ReactoryConstants.SETTING_KEYS.NEW_USER_ROLES;
    });
    
    if (setting && setting.data && Array.isArray(setting) === false) return setting.data;
    return ['USER'];
  }

  return ['USER'];
};

// eslint-disable-next-line max-len
const getSetting = function getSetting<T>(
  name: string,
  defaultValue: T = null,
  create = false,
  componentFqn: string = null): { data: T } {

  if (Array.isArray(this.settings)) {
    const found = find(this.settings, { name });
    if (found) return found;

    if (isNil(defaultValue) === false && create === true) {
      this.settings.push({
        name,
        data: defaultValue,
        componentFqn: componentFqn,
        formSchema: null,
      });

      this.save().then(); // do not wait for return, assume it was saved
      return { data: defaultValue };
    }

    return { data: defaultValue };
  }

  return { data: defaultValue };
};

const validatePassword = function validatePassword(password: string) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

const colorScheme = function colorScheme(colorvalue: string = null) {
  let base = colorvalue;

  try {
    if (this.themeOptions && this.themeOptions.palette) {
      if (base === 'primary' || base === null) base = this.themeOptions.palette.primary.main;
      if (base === 'secondary') base = this.themeOptions.palette.secondary.main;
    }
  } catch (err) {
    // do nothing
    logger.warn('Could not generate colorscheme', err);
  }

  if (typeof base === 'string' && base.indexOf('#') >= 0) base = base.replace('#', '');

  const scm = new ColorScheme();
  scm.from_hex(base || 'FF0000')
    .scheme('triade')
    .distance(0.1)
    .add_complement(false)
    .variation('pastel')
    .web_safe(true);

  return scm.colors();
};

/**
 * Generates the content for a PWA client `.env` file from the ReactoryClient document.
 * 
 * The password is sourced from process.env since the model stores a hashed version.
 * The env variable convention is `REACTORY_CLIENT_PASSWORD_<UPPER_KEY>` or falls back
 * to `REACTORY_APPLICATION_PASSWORD`.
 * 
 * @param options - Optional overrides for the env file generation
 * @param options.apiEndpoint - Override for REACT_APP_API_ENDPOINT
 * @param options.cdnRoot - Override for REACT_APP_CDN
 * @param options.port - Override for PORT
 * @param options.nodeEnv - Override for NODE_ENV
 * @returns The env file content as a string
 */
const toClientEnv = function toClientEnv(options?: {
  apiEndpoint?: string;
  cdnRoot?: string;
  port?: number;
  nodeEnv?: string;
}): string {
  const client: Reactory.Models.IReactoryClient = this as Reactory.Models.IReactoryClient;

  const {
    API_URI_ROOT = 'http://localhost:4000',
    CDN_ROOT = 'http://localhost:4000/cdn',
  } = process.env;


  let apiEndpoint = options?.apiEndpoint || API_URI_ROOT;
  const upperKey = client.key.toUpperCase().replace(/-/g, '_');
  // ensure apiEndpoint does not end with a slash
  apiEndpoint = apiEndpoint.replace(/\/+$/, '');
  // Normalise CDN root — never store a trailing slash
  const cdnRoot = (options?.cdnRoot || CDN_ROOT).replace(/\/+$/, '');
  const port = options?.port || process.env[`${upperKey}_APPLICATION_PORT`] ? Number.parseInt(process.env[`${upperKey}_APPLICATION_PORT`], 10) : 3000;
  const nodeEnv = options?.nodeEnv || process.env.NODE_ENV || 'development';

  // Resolve the client password from the environment since the model stores
  // a hashed version. Convention: REACTORY_CLIENT_PASSWORD_<UPPER_KEY> or
  // falls back to REACTORY_APPLICATION_PASSWORD.
  const clientPassword = process.env[`${upperKey}_APPLICATION_PASSWORD`]
    || process.env.REACTORY_APPLICATION_PASSWORD
    || '';

  const clientAnonUserEmail = process.env[`${upperKey}_ANONUSER_EMAIL`] || process.env.REACTORY_APPLICATION_ANONUSER_EMAIL || 'anon@reactor.local';
  const clientAnonUserPassword = process.env[`${upperKey}_ANONUSER_PASSWORD`] || process.env.REACTORY_APPLICATION_ANONUSER_PASSWORD || 'anonymousepassword';

  // Extract primary color and background from the active theme
  let themePrimary = '#1a2049';
  let themeBg = '#464775';

  if (Array.isArray(client.themes) && client.themes.length > 0) {
    const activeTheme = client.themes.find(t => t.name === client.theme) || client.themes[0];
    if (activeTheme?.modes && activeTheme.modes.length > 0) {
      const defaultMode = activeTheme.defaultThemeMode || 'dark';
      const mode = activeTheme.modes.find(m => m.mode === defaultMode) || activeTheme.modes[0];
      if (mode?.options?.palette) {
        themePrimary = mode.options.palette.primary?.main || themePrimary;
        themeBg = mode.options.palette.background?.default || themeBg;
      }
    }
  }

  const lines = [
    `# Auto-generated env file for client: ${client.key}`,
    `# Generated at: ${new Date().toISOString()}`,
    ``,
    `# The base URL for the Reactory API`,
    `REACT_APP_API_ENDPOINT=${apiEndpoint}`,
    ``,
    `# The base URL for the Reactory CDN`,
    `REACT_APP_CDN=${cdnRoot}`,
    ``,
    `# The title of the application`,
    `REACT_APP_TITLE='${client.name || client.key}'`,
    ``,
    `# The name of the theme`,
    `REACT_APP_THEME=${client.theme || client.key}`,
    ``,
    `# The client key`,
    `REACT_APP_CLIENT_KEY=${client.key}`,
    ``,
    `# The short name of the app`,
    `REACT_APP_SHORTNAME=${client.name || client.key}`,
    ``,
    `# The client password`,
    `REACT_APP_CLIENT_PASSWORD=${clientPassword}`,
    ``,
    `# The anonymous user email`,
    `REACTORY_APPLICATION_ANONUSER_EMAIL=${clientAnonUserEmail}`,
    ``,
    `# The anonymous user password`,
    `REACTORY_APPLICATION_ANONUSER_PASSWORD=${clientAnonUserPassword}`,
    ``,
    `# The primary color for the theme`,
    `REACT_APP_THEME_PRIMARY=${themePrimary}`,
    ``,
    `# The background color for the theme`,
    `REACT_APP_THEME_BG=${themeBg}`,
    ``,
    `# Disables CI-specific features during build`,
    `CI=false`,
    ``,
    `# The port to use for the local development server`,
    `PORT=${port}`,
    ``,
    `# The Node.js environment to use`,
    `NODE_ENV=${nodeEnv}`,
    ``,
    `# The Babel environment to use`,
    `BABEL_ENV=${nodeEnv}`,
  ];

  return lines.join('\n') + '\n';
};

export default {
  setPassword,
  getDefaultUserRoles,
  getSetting,
  validatePassword,
  colorScheme,
  toClientEnv,
}