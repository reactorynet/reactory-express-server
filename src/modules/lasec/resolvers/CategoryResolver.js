import { CoreCategory } from '@reactory/server-core/modules/core/models';
import LasecCategoryFilter from '@reactory/server-core/modules/lasec/models/CategoryFilter';
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

const getCategoryFilters = async () => {
  logger.debug(`GETTING CATEGORY FILTERS!!!!`);

  const categoryFilters = await LasecCategoryFilter.find({}).then();

  logger.debug(`CATEGORY FILTERS::   ${categoryFilters}`);

  return categoryFilters;
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
    throw new ApiError('A category by this name already exists. Please choose a unique name.');
  }
  const newCategory = new CoreCategory({ ...input, key: slug }).save();
  return newCategory;
}

const updateCategory = async (id, input) => {
  return await CoreCategory.findOneAndUpdate({ _id: ObjectId(id) }, { ...input }).then();
}

const createNewCategoryFilter = async (input) => {

  const slug = toSlug(input.title.toLowerCase());

  const exists = await LasecCategoryFilter.findOne({ key: slug }).then();
  if (exists) {
    throw new ApiError('A category filter by this name already exists. Please choose a unique name.');
  }

  input.filterOptions.forEach(fo => fo.key = fo.key || toSlug(fo.text));

  logger.debug(`CREATING CATEGORY FILTER:: ${JSON.stringify(input)}`);

  const categoryFilter = await new LasecCategoryFilter({ ...input, key: slug }).save().then();

  logger.debug(`NEW CATEGORY FILTER:: ${JSON.stringify(categoryFilter)}`);

  return categoryFilter;
}

const updateCategoryFilter = async (id, input) => {

  logger.debug(`UPDATING CAT FILTER INPUTS:: ${id}, ${JSON.stringify(input)}`);

  const result = await LasecCategoryFilter.findOneAndUpdate({ _id: ObjectId(id) }, { ...input }).then();

  logger.debug(`UPDATING CAT FILTER:: ${result}`)

  return result;
}

export default {
  Category: {
    id: (category) => {
      return `${category._id}`
    }
  },
  CategoryFilter: {
    id: (categoryFilter) => {
      return `${categoryFilter._id}`
    }
  },
  ListItem: {
    id: (item) => {
      return `${item._id}`
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
    },
    LasecGetCategoryFilters: async () => {
      return getCategoryFilters();
    }
  },
  Mutation: {
    LasecCreateNewCategory: async (parent, { input }) => {
      return createNewCategory(input);
    },
    LasecUpdateCategory: async (parent, { id, input }) => {
      return updateCategory(id, input);
    },
    LasecCreateCategoryFilter: async (parent, { input }) => {
      return createNewCategoryFilter(input);
    },
    LasecUpdateCategoryFilter: async (parent, {id, input}) => {
      return updateCategoryFilter(id, input);
    }
  }
};
