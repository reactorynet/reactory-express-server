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

export default {
  setPassword,
  getDefaultUserRoles,
  getSetting,
  validatePassword,
  colorScheme,
}