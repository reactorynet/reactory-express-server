import mongoose from 'mongoose';
import crypto from 'crypto';

const { ObjectId } = mongoose.Schema.Types;
const MembershipSchema = mongoose.Schema({
  clientId: ObjectId,
  organizationId: ObjectId,
  enabled: Boolean,
  authProvider: String,
  providerId: String,
  lastLogin: Date,
  roles: [String],
});

const UserSchema = new mongoose.Schema({
  id: ObjectId,
  username: String,
  firstName: String,
  lastName: String,
  email: String,
  salt: String,
  password: String,
  avatar: String,
  memberships: [MembershipSchema],
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
        refresh: String,
        roles: [String],
      },
    },
  ],
  legacyId: Number,
  createdAt: Date,
  updatedAt: Date,
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
