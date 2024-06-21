import mongoose from 'mongoose';
import schema from './schema';

export const REACTORY_CLIENT = 'ReactoryClient';
const ReactoryClientModel = mongoose.model<Reactory.Models.IReactoryClient & Reactory.Service.IReactoryStartupAwareService>(REACTORY_CLIENT, schema);
export type TReactoryClientModel = typeof ReactoryClientModel;
export default ReactoryClientModel;