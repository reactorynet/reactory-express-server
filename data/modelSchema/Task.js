export default {
  title: 'Task Details',
  type: 'object',
  required: [
    'title',
  ],
  properties: {
    id: {
      type: 'string',
      title: 'id',
    },
    project: {
      type: 'string',
      title: 'Project',
    },
    board: {
      type: 'string',
      title: 'Board',
    },
    priority: {
      type: 'string',
      title: 'Priority',
    },
    title: {
      type: 'string',
      title: 'Title',
    },
    taskType: {
      type: 'string',
      title: 'Task Type',
    },
    taskCost: {
      type: 'number',
      title: 'Cost Value',
    },
    effortEstimate: {
      type: 'number',
      title: 'Effort (hrs)',
    },
    currency: {
      type: 'string',
      title: 'Currency',
    },
    shortCodeId: {
      type: 'number',
      title: 'Short Code Number',
    },
    description: {
      type: 'string',
      title: 'Description',
    },
    slug: {
      type: 'string',
      title: 'Slug',
    },
    labels: {
      type: 'array',
      title: 'Labels',
      items: {
        type: 'string',
        title: 'Label',
      },
    },
    percentComplete: {
      type: 'number',
      title: 'Percentage Complete',
    },
    category: {
      type: 'string',
      title: 'Category',
    },
    workflowStatus: {
      type: 'string',
      title: 'Workflow-Status',
    },
    status: {
      type: 'string',
      title: 'Status',
    },
    externalUrls: {
      type: 'array',
      title: 'External Urls',
      items: {
        type: 'string',
        title: 'Url',
      },
    },
    user: {
      type: 'string',
      title: 'Assigned To',
    },
  },
};
