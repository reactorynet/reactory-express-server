/* eslint-disable no-template-curly-in-string */

const ApiStatusReport = {
  enabled: true,
  view: 'reactory-api-status-report',
  kind: 'pdf',
  format: 'pdf',
  name: 'Reactory Api Status Report',
  content: 'some-pdf-dsl',
  props: {
    meta: {
      title: '${data.applicationTitle}',
      author: '${data.firstName} ${data.lastName}',
    },
  },
  elements: [

  ],
};

export default ApiStatusReport;
