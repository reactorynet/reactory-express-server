import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const ApplicationSchema = new mongoose.Schema({
  id: ObjectId,
  title: String,
  description: String,
  version: String,
  createdAt: Date,
  updatedAt: Date,
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  updatedBy: {
    ref: 'User',
    type: ObjectId,
  }
});

const ApplicationModel = mongoose.model('Application', ApplicationSchema, 'reactory_applications');
export default ApplicationModel;
