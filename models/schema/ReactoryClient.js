import mongoose from 'mongoose';
import crypto from 'crypto';

const { ObjectId } = mongoose.Schema.Types;

const ReactoryClientSchema = new mongoose.Schema({
  id: ObjectId,
  name: String,
  username: String,
  email: String,
  salt: String,
  password: String,
  avatar: String,
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
  whitelist: [String],
  createdAt: Date,
  updatedAt: Date,
});

ReactoryClientSchema.methods.setPassword = function setPassword(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

ReactoryClientSchema.methods.validatePassword = function validatePassword(password) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

const ReactoryClientModel = mongoose.model('ReactoryClient', ReactoryClientSchema);
export default ReactoryClientModel;
