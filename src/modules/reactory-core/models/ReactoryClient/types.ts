import { Model } from 'mongoose';

export type TReactoryClientModel = Model<Reactory.Models.IReactoryClient & Reactory.Service.IReactoryStartupAwareService>;