import timeStamp from '@reactory/server-core/models/plugins/time';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const ReactoryResourceSchema = new mongoose.Schema({
  id: ObjectId,
  resourceType: String,
  version: String,
  build: String,
  name: String,
  link: String,
  when: Date,
  meta: {},
});

ReactoryResourceSchema.plugin(timeStamp)

const ReactoryResource = mongoose.model('ReactoryResource', ReactoryResourceSchema);

export default ReactoryResource;
