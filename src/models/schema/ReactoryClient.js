import mongoose from 'mongoose';
import crypto from 'crypto';
import * as lodash from 'lodash';
import ReactoryConstants from '../../constants';
import logger from '../../logging';

const { ObjectId } = mongoose.Schema.Types;
const { find, isArray } = lodash;

const ReactoryClientSchema = new mongoose.Schema({
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
  theme: String, // theme title
  mode: String,
  themeOptions: {},
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
      componentFqn: String,
      args: [
        { },
      ],
    },
  ],
  auth_config: [
    {
      provider: String,
      enabled: Boolean,
      successCallbackUrl: String,
      failedCallbackUrl: String,
      apikey: String,
      apipass: String,
      scopes: [String],
    },
  ],
  settings: [
    {
      name: String,
      componentFqn: String,
      formSchema: { },
      data: { },
    },
  ],
  whitelist: [String],
  createdAt: Date,
  updatedAt: Date,
});

ReactoryClientSchema.methods.setPassword = function setPassword(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

ReactoryClientSchema.methods.getDefaultUserRoles = function getDefaultUserRoles() {
  if (isArray(this.settings) === true && this.settings.length > 0) {
    const setting = find(this.settings, { name: ReactoryConstants.SETTING_KEYS.NEW_USER_ROLES });
    if (setting && setting.data && isArray(setting)) return setting.data;
    return ['USER'];
  }

  return ['USER'];
};

// eslint-disable-next-line max-len
ReactoryClientSchema.methods.getSetting = function getSetting(name, defaultValue = null, create = false) {
  logger.info(`Looking up setting ${name}`, { defaultValue, create });
  if (isArray(this.settings)) {
    const found = find(this.settings, { name });
    if (found) return found;

    if (isNil(defaultValue) === false && create === true) {
      this.settings.push({
        name, data: defaultValue, componentFqn: null, formSchema: null,
      });
      this.save(); // do not wait for return, assume it was saved

      return defaultValue;
    }
  } return null;
};

ReactoryClientSchema.methods.validatePassword = function validatePassword(password) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

const ReactoryClientModel = mongoose.model('ReactoryClient', ReactoryClientSchema);
export default ReactoryClientModel;
