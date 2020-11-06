

const MaterialTableWidgetDefintion: any =  {
  'ui:widget': 'MaterialTableWidget',
  'ui:options': {
    columns: [
      {
        title: 'Filename', field: 'filename'
      },
      {
        title: 'Type', field: 'mimetype',
        components: [
          {
            component: 'core.ConditionalIconComponent@1.0.0',
            props: {
              'ui:options': {},
              conditions: [
                {
                  key: 'image/png',
                  icon: 'photo',
                  style: {
                    color: '#5EB848'
                  },
                  tooltip: 'PNG'
                },
                {
                  key: 'image/jpeg',
                  icon: 'photo',
                  style: {
                    color: '#5EB848'
                  },
                  tooltip: 'JPEG'
                },
                {
                  key: 'image/gif',
                  icon: 'gif',
                  style: {
                    color: '#5EB848'
                  },
                  tooltip: 'GIF'
                },
                {
                  key: 'application/pdf',
                  icon: 'picture_as_pdf',
                  style: {
                    color: '#5EB848'
                  },
                  tooltip: 'Pdf document'
                }
              ]
            },
            style: {
              marginRight: '8px',
              marginTop: '8px',
            },
            propsMap: {
              'rowData.mimetype': 'value',
            },
          }
        ],
        propsMap: {
          'rowData.mimetype': 'selectedKey'
        }
      },
      {
        title: 'Uploaded By',
        field: 'owner',
        component: 'core.LabelComponent@1.0.0',
        props: {
          uiSchema: {
            'ui:options': {
              variant: 'body1',
              format: '${rowData.owner.fullName}'
            }
          },
        },
        propsMap: {
          'rowData.invoiceDate': 'value',
        }
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
    refreshEvents: [
      { name: 'lasec-crm::new-company::document::uploaded' }
    ],
    variables: {
      'props.formContext.$formData.paging': 'paging',
      'props.formContext.$formData.filter': 'filter',
      'props.formContext.$formData.uploadContexts': 'uploadContexts',
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
