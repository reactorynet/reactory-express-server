import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const CategoryFilter = mongoose.Schema({
  id: ObjectId,
  title: String,
  filterOptions: [{
    id: ObjectId,
    key: String,
    text: String,
    value: String
  }],
  selectMultiple: Boolean,
  key: String
});

const CategoryFilterModel = mongoose.model('LasecCategoryFilter', CategoryFilter);

export default CategoryFilterModel;

