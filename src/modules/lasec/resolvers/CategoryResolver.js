import { CoreCategory } from '@reactory/server-core/modules/core/models';
import ApiError from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';
import logger from '../../../logging';

const getCategories = async (params) => {
  const categories = await CoreCategory.find({}).then();
  return categories;
}

const getCategoryById = async (id) => {
  const category = await CoreCategory.findById(id).then();
  return category;
}

const getCategoryByKey = async (key) => {
  const category = await CoreCategory.findOne({ key: key }).then();
  return category;
}

const toSlug = (input) => {
  let regex = /[^\w\s]/g; // Remove @ _ . ! # ? > < = +
  const processed = input.replace(regex, "").replace(/\s/g, "-").trim();
  return processed;
}

const createNewCategory = async (input) => {

  logger.debug(`CREATING NEW CATEGORY:: ${JSON.stringify(input)}`);

  const slug = toSlug(input.name.toLowerCase());
  const exists = await CoreCategory.findOne({ key: slug }).then();
  if (exists) {
    throw new ApiError('A category by this name already exists. Please chose a unique name.');
  }

  const newCategory = new CoreCategory({ ...input, key: slug }).save();
  return newCategory;
}

const updateCategory = async (id, input) => {
  return await CoreCategory.findOneAndUpdate({ _id: ObjectId(id) }, { ...input }).then();
}

export default {
  Category: {
    id: (category) => {
      return `${category._id}`
    }
  },
  Query: {
    LasecGetCategoryList: async (obj, args) => {
      return getCategories();
    },
    LasecGetCategoryById: async (obj, { id }) => {
      return getCategoryById(id);
    },
    LasecGetCategoryByKey: async (obj, { key }) => {
      return getCategoryByKey(key);
    }
  },
  Mutation: {
    LasecCreateNewCategory: async (parent, { input }) => {
      return createNewCategory(input);
    },
    LasecUpdateCategory: async (parent, { id, input }) => {
      return updateCategory(id, input);
    }
  }
};
