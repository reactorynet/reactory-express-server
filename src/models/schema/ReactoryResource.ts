import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const ReactoryResourceSchema = mongoose.Schema({
  id: ObjectId,
  resourceType: String,
  version: String,
  build: String,
  name: String,
  link: String,
  when: Date,
  meta: { },
}, { timestamp: true });

const ReactoryResource = mongoose.model('ReactoryResource', ReactoryResourceSchema);

export default ReactoryResource;
