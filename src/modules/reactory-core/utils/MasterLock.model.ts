import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMasterLock extends Document {
  name: string;
  ownerId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

const MasterLockSchema = new Schema<IMasterLock>(
  {
    name: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    acquiredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const MasterLockModel: Model<IMasterLock> =
  (mongoose.models.MasterLock as Model<IMasterLock>) ||
  mongoose.model<IMasterLock>("MasterLock", MasterLockSchema, "reactory_master_locks");