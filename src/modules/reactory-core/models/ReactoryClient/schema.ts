import mongoose from 'mongoose';
import methods from './methods';
import statics from './statics';
const { ObjectId } = mongoose.Schema.Types;

const ReactoryApplicationPluginSchema = new mongoose.Schema<Reactory.Platform.IReactoryApplicationPlugin>({ 
  id: String,  
  name: String,
  nameSpace: String,
  version: String,
  description: String,
  platform: String,
  uri: String,
  loader: String,
  mimeType: String,
  options: {},
  enabled: Boolean,
  roles: [String],
});

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
  password: String,
  avatar: String,
  theme: String, 
  mode: String,  
  themes: [{
  }],
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
      componentProps: {}
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
      settingType: String,
      variant: String,
      title: String,
      description: String,
      componentFqn: String,
      formSchema: {},
      data: {},
    },
  ],
  whitelist: [String],
  plugins: [ReactoryApplicationPluginSchema],
}, {
  methods,
  statics,
  timestamps: true
});

export default ReactoryClientMongooseSchema;