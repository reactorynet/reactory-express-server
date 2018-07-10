import mongoose from 'mongoose';
import crypto from 'crypto';

const { ObjectId } = mongoose.Schema.Types;


const UserSchema = new mongoose.Schema({
  id: ObjectId,
  username: String,
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    index: true,
    lowercase: true,
    trim: true,
  },
  salt: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: String,
  memberships: [
    {
      clientId: ObjectId,
      organizationId: ObjectId,
      businessUnit: String,
      enabled: Boolean,
      authProvider: String,
      providerId: String,
      lastLogin: Date,
      roles: [String],
    },
  ],
  sessionInfo: [
    {
      id: String,
      host: String,
      client: String,
      jwtPayload: {
        iss: String,
        sub: String,
        exp: Date,
        aud: [String],
        iat: Date,
        userId: ObjectId,
        organizationId: ObjectId,
        refresh: String,
        roles: [String],
      },
    },
  ],
  legacyId: Number,
  lastLogin: Date,
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});

UserSchema.methods.setPassword = function setPassword(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function validatePassword(password) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

const UserModel = mongoose.model('User', UserSchema);
export default UserModel;
