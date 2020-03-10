const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    }
  },
  'ui:field':'GridLayout',
  'ui:grid-layout': [
    {
      paging: { md: 2, sm: 12 },
      search: { md: 4, sm: 12 },
      filterBy: { md: 4, sm: 12 },
    },
    {
      quotes: {
        md: 12
      }
    }
  ],
  search: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData && formData.length > 3 ? "Searching for `" + formData + "`" : "Enter search keyword" }',
      variant: 'body1',
    }
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  filterBy: {
    'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'my_quotes', value: 'my_quotes', label: 'My Quptes' },
          { key: 'all_quotes', value: 'all_quotes', label: 'All Quotes' },
        ],
      },
  },
  quotes: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [

        { title: 'Quotes Number', field: 'code' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'quotes': 'data',
      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
