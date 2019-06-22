import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const Scale = mongoose.Schema({
  id: ObjectId,
  legacyId: String,
  key: String,
  title: String,
  entries: [
    {
      rating: Number,
      description: String,
    },
  ],
});

const ScaleModel = mongoose.model('Scale', Scale);
export default ScaleModel;
