import mongoose, { Schema, MongooseDocument, Model } from 'mongoose';
import { ReactoryUserSchema } from '@reactory/server-core/models/schema/User';
import { Reactory } from '@reactory/server-core/types/reactory';
import { getLoggedIn360User } from 'modules/lasec/resolvers/Helpers';

export interface ILasecUserSchema extends Reactory.IUserDocument {
  getLoggedInUser: Promise<any>
};

ReactoryUserSchema.methods.getLoggedInUser = getLoggedIn360User;


export default mongoose.model('LasecUser', ReactoryUserSchema as Schema<ILasecUserSchema>, 'User', true);