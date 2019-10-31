import { CoreCategory } from '@reactory/server-core/modules/core/models';
import LasecCategoryFilter from '@reactory/server-core/modules/lasec/models/CategoryFilter';
import ApiError from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';
import logger from '../../../logging';
import _ from 'lodash';

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
  return await LasecCategoryFilter.find({}).then();
}

const getCategoryFilterById = async (id) => {
  return await LasecCategoryFilter.findById(id).then();
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
  return await new LasecCategoryFilter({ ...input, key: slug }).save().then();
}

const updateCategoryFilter = async (id, input) => {
  input.filterOptions.forEach(fo => fo.key = fo.key || toSlug(fo.text));
  return await LasecCategoryFilter.findOneAndUpdate({ _id: ObjectId(id) }, { ...input }).then();
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
    },
    LasecGetCategoryFilterById: async (obj, { id }) => {
      return getCategoryFilterById(id);
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
    LasecUpdateCategoryFilter: async (parent, { id, input }) => {
      return updateCategoryFilter(id, input);
    }
  }
};
