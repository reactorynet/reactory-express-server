

const MaterialTableWidgetDefintion: any =  {
  'ui:widget': 'MaterialTableWidget',
  'ui:options': {
    columns: [
      {
        title: 'Filename', field: 'filename'
      },
      {
        title: 'Friendly Name', field: 'alias'
      },
      {
        title: 'Size', field: 'size'
      },
      {
        title: 'Type', field: 'mimetype'
      },
      {
        title: 'Link', field: 'link'
      },
    ],

    options: {
      grouping: false,
      search: false,
      showTitle: false,
      toolbar: false,
    },
    remoteData: true,
    query: 'query',
    refreshOn: ['lasec-crm::new-company::document::uploaded'],
    variables: {      
      'props.formContext.$formData.paging': 'paging',      
      'props.formContext.$formData.filter': 'filter',
    },
    resultMap: {
      'paging.page': 'page',
      'paging.total': 'totalCount',
      'paging.pageSize': 'pageSize',             
      'documents': 'data',        
    },
    resultType: 'object', 
  }
};

 

export default MaterialTableWidgetDefintion;