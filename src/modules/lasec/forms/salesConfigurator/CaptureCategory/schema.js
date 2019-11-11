import categoryDetailSchema from '../CategoryDetail/schema';
export default {
  type: 'object',
  title: 'Capture Category',
  properties: {
    categoryDetail: categoryDetailSchema
  }
};
