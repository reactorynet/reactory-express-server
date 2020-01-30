import Reactory from '@reactory/server-core/types/reactory';

const $toolbar = {
  type: 'object',
  title: '',
  properties: {
    product: {
      type: 'string',
      title: 'Product',
    },
    supplier: {
      title: 'Supplier',
      type: 'string',
    }
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'Product Catelog',
  properties: {
    toolbar: $toolbar
  }

};

export default schema;
