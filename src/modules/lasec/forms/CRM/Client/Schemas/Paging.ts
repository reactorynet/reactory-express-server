import { Reactory } from "@reactory/server-core/types/reactory";

const paging: Reactory.ISchema = {
  type: 'object',
  title: 'Paging',
  properties: {
    total: {
      type: 'number'
    },
    page: {
      type: 'number'
    },
    pageSize: {
      type: 'number'
    },
    hasNext: {
      type: 'boolean'
    }
  }
};


export default paging;