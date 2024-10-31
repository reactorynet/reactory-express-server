import mongoose from 'mongoose';
import schema from './schema';

export const REACTORY_CLIENT = 'ReactoryClient';
const ReactoryClientModel = mongoose.model(REACTORY_CLIENT, schema, "reactory_clients");
export type TReactoryClientModel = typeof ReactoryClientModel;
export default ReactoryClientModel;