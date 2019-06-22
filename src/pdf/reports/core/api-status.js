
const ApiStatusReport = {
  enabled: true,
  view: 'delegate-360-assessment',
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
