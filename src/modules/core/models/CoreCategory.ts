import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
import moment from 'moment';

const CoreCategorySchema = new mongoose.Schema({
  id: ObjectId,
  parentId: {
    type: ObjectId,
    ref: 'CoreCategory'
  },
  children: [ {
    type: ObjectId,
    ref: 'CoreCategory'
  }],
  items: [ {} ],
  linkType: String, //ObjectId, string, number
  linkTarget: String, //LasecProduct, $foreign
  foreignResolver: String, //componentFqn
  key: String,
  partner: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  name: String,
  description: String,
});


const CoreCategoryModel = mongoose.model('CoreCategory', CoreCategorySchema);

export default CoreCategoryModel;
