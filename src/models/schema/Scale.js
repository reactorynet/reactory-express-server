import mongoose from 'mongoose';
import lodash from 'lodash';

const { ObjectId } = mongoose.Schema.Types;
const Scale = mongoose.Schema({
  id: ObjectId,
  legacyId: String,
  key: String,
  title: String,
  description: String,
  entries: [
    {
      id: ObjectId,
      rating: Number,
      description: String,
    },
  ],
});

Scale.methods.maxRating = function(){

  const max = lodash.maxBy(this.entries, 'rating');

  if(max) return max.rating;
};

const ScaleModel = mongoose.model('Scale', Scale);
export default ScaleModel;
