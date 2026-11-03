import mongoose from 'mongoose';
import methods from './methods';
import statics from './statics';
import { ReactoryFeatureFlagValueSchema } from '../ReactoryFeatureFlag';
const { ObjectId, Mixed } = mongoose.Schema.Types;

const ReactoryApplicationPluginSchema = new mongoose.Schema<Reactory.Platform.IReactoryApplicationPlugin & { integrity?: string }>({ 
  id: String,  
  name: String,
  nameSpace: String,
  version: String,
  description: String,
  platform: String,
  uri: String,
  loader: String,
  mimeType: String,
  options: Mixed,
  enabled: Boolean,
  roles: [String],
  // Explicit SRI for a plugin hosted outside this server's CDN (WP-C4).
  integrity: String,
}, { _id: false });

export const ServiceKeySchema = new mongoose.Schema({
  label: { type: String, required: true },
  keyHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: Date,
  disabled: { type: Boolean, default: false },
}, { _id: true });

const ReactoryClientMongooseSchema = new mongoose.Schema<Reactory.Models.IReactoryClient>({
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
  // Route the *activation* link in the registration email points at, and the
  // route a browser is sent to afterwards. Declared here for the same reason
  // `resetEmailRoute` is: the registration flow reads them off the application
  // document, and Mongoose drops paths that are not in the schema, so an
  // undeclared field would silently never arrive.
  //
  // Both are optional. When unset the route resolver falls back to the
  // `email_activation_route` / `email_activation_result_route` settings and
  // then to the documented defaults (`/useraccount/activate`, `/login`).
  activationEmailRoute: String,
  activationResultRoute: String,
  password: String,
  avatar: String,
  theme: String, 
  mode: String,
  owner: {
    type: ObjectId,
    ref: 'User',
  }, 
  themes: [Mixed],
  applicationRoles: [String], 
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
      _id: false,
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
      id: String,
      key: String,
      title: String,
      path: String,
      public: Boolean,
      roles: [String],
      exact: Boolean,
      redirect: String,
      componentFqn: String,
      header: {
        show: Boolean,
        title: String,
        componentFqn: String,
        props: Mixed,
        propsMap: Mixed,
      },
      footer: {
        show: Boolean,
        title: String,
        componentFqn: String,
        props: Mixed,
        propsMap: Mixed,
      },
      args: [
        Mixed,
      ],
      componentProps: Mixed,
      _id: false,
    },
  ],
  auth_config: [
    {
      provider: String,
      enabled: Boolean,
      properties: Mixed,
      options: Mixed,
      _id: false,
    },
  ],
  settings: [
    {
      name: String,
      settingType: String,
      variant: String,
      title: String,
      description: String,
      componentFqn: String,
      formSchema: Mixed,
      data: Mixed,
      _id: false,
    },
  ],
  whitelist: [String],
  plugins: [ReactoryApplicationPluginSchema],
  featureFlags: [ReactoryFeatureFlagValueSchema],
  serviceKeys: [ServiceKeySchema],
  publicKey: {
    type: String,
    index: true,
  },
  browserAuth: {
    type: String,
    enum: ['origin', 'secret'],
    default: 'origin',
  },
}, {
  methods,
  statics,
  timestamps: true
});

export default ReactoryClientMongooseSchema;