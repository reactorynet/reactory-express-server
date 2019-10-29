import logger from '../../../logging';
import CoreCategory from '../../core/models';
import ApiError from '@reactory/server-core/exceptions';

const getCategories = async (params) => {
  const categories = CoreCategory.find({});
  logger.info('Categories:: ', categories);
  return categories;
}

const getCategoryById = async (categoryId) => {
  const categories = CoreCategory.findOne({ id: ObjectId(categoryId) });

  logger.info('Categories:: ', categories);

  return categories;
}

const getCategoryByKey = async (categoryKey) => {
  const categories = CoreCategory.findOne({ key: categoryKey });

  logger.info('Categories:: ', categories);

  return categories;
}

const toSlug = (input) => {
  let regex = /[^\w\s]/g; // Remove @ _ . ! # ? > < = +
  const processed = input.replace(regex, "").replace(/\s/g, "-").trim();
  return processed;
}

const createNewCategory = async (input) => {
  const slug = toSlug(input.name.toLowerCase());
  const exists = await CoreCategory.findOne({ key: slug }).then();
  if (exists) {
    throw new ApiError('A category by this name already exists. Please chose a unique name.');
  }

  const newCategory = new Category({ ...input, key: slug }).save();
  return newCategory;
}

const updateCategory = async (categoryId, input) => {

}

export default {
  Query: {
    LasecGetCategories: async (obj, args) => {
      return getCategories();
    },
    LasecGetCategoryById: async (obj, { id }) => {
      return getCategoryById(categoryId);
    },
    // LasecGetCategoryByKey: async (obj, { key }) => {
    //   return getCategoryByKey(key);
    // }
  },
  Mutation: {
    LasecCreateNewCategory: async (parent, { input }) => {
      return createNewCategory(input);
    },
    // LasecUpdateCategory: async (parent, { categoryId, input }) => {
    //   return updateCategory(category, input);
    // }
  }
};
