import mongoose from 'mongoose';
import schema from './schema';

export const REACTORY_CLIENT = 'ReactoryClient';
export default mongoose.model<Reactory.Models.IReactoryClient>(REACTORY_CLIENT, schema);