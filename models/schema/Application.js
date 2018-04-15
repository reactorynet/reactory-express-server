import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const ApplicationSchema = new mongoose.Schema({
  id: ObjectId,
  title: String,
  description: String,
  version: String,
  createdAt: Date,
  updatedAt: Date,
});

const ApplicationModel = mongoose.model('Application', ApplicationSchema);
export default ApplicationModel;
