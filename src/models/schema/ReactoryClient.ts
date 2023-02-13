import mongoose from 'mongoose';
import crypto from 'crypto';
import * as lodash from 'lodash';
//@ts-ignore
import ColorScheme from 'color-scheme';
import ReactoryConstants from '@reactory/server-core/constants';
import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';

const { ObjectId } = mongoose.Schema.Types;
const { find, isArray } = lodash;

const ReactoryClientSchema = new mongoose.Schema<Reactory.Models.IReactoryClient>({
  id: ObjectId,
  key: {
    type: String,
    index: true,
    unique: true,
    lowercase: true,
  },
  name: String,
  username: String,
  email: String,
  salt: String,
  siteUrl: String,
  emailSendVia: String,
  emailApiKey: String,
  resetEmailRoute: String,
  password: String,
  avatar: String, // application avatar
  theme: String, // default theme for this client
  mode: String,  
  themes: [{
  }],
  applicationRoles: [String], // roles configured for the app
  billingType: String,
  components: [
    {
      type: ObjectId,
      ref: 'ClientComponent',
    },
  ],
  modules: [
    {
      key: String,
      value: String,
    },
  ],
  menus: [
    {
      type: ObjectId,
      ref: 'Menu',
    },
  ],
  routes: [
    {
      key: String,
      title: String,
      path: String,
      public: Boolean,
      roles: [String],
      exact: Boolean,
      redirect: String,
      componentFqn: String,
      args: [
        {},
      ],
    },
  ],
  auth_config: [
    {
      provider: String,
      enabled: Boolean,
      properties: {},
    },
  ],
  settings: [
    {
      name: String,
      componentFqn: String,
      formSchema: {},
      data: {},
    },
  ],
  whitelist: [String],
  createdAt: Date,
  updatedAt: Date,
});

ReactoryClientSchema.methods.setPassword = function setPassword(password: string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

ReactoryClientSchema.methods.getDefaultUserRoles = function getDefaultUserRoles() {
  if (isArray(this.settings) === true && this.settings.length > 0) {
    const setting = find(this.settings, { name: ReactoryConstants.SETTING_KEYS.NEW_USER_ROLES });
    if (setting && setting.data && isArray(setting) === false) return setting.data;
    return ['USER'];
  }

  return ['USER'];
};

// eslint-disable-next-line max-len
ReactoryClientSchema.methods.getSetting = function getSetting(name: string, defaultValue: any = null, create = false, componentFqn: string = null) {
  if (isArray(this.settings)) {
    const found = find(this.settings, { name });
    if (found) return found;

    if (lodash.isNil(defaultValue) === false && create === true) {
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

ReactoryClientSchema.methods.validatePassword = function validatePassword(password: string) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

ReactoryClientSchema.methods.colorScheme = function colorScheme(colorvalue: string = null) {
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

const ReactoryClientModel = mongoose.model('ReactoryClient', ReactoryClientSchema);
export default ReactoryClientModel;
