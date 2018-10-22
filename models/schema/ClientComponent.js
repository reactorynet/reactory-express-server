import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Project / Board
 *
 */

const ClientComponentSchema = new mongoose.Schema({
  id: ObjectId,
  title: String,
  description: String,
  uri: String,
  name: String,
  version: String,
  nameSpace: String,
  roles: [String],
  author: {
    type: ObjectId,
    ref: 'User',
  },
  labels: [String],
  arguments: [
    {
      key: String,
      value: { },
    },
  ],
  resources: [
    {
      uri: String,
      name: String,
      resourceType: {
        type: String,
        enum: ['script', 'style', 'document'],
      },
    },
  ],
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});

const ClientComponentModel = mongoose.model('ClientComponent', ClientComponentSchema);
export default ClientComponentModel;
