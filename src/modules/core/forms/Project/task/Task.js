export default {
  title: 'Task Details',
  type: 'object',
  required: [
    'title',
    'description',
  ],
  dependencies: {
    milestone: [
      'taskType',
    ],
  },
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
    startDate: {
      type: 'string',
      title: 'Start Date',
    },
    endDate: {
      type: 'string',
      title: 'End Date',
    },
    user: {
      type: 'string',
      title: 'Assigned To',
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
    milestone: {
      type: 'string',
      title: 'Linked Milestone',
    },
    taskCost: {
      type: 'string',
      title: 'This is the new cost field',
    },
    effortEstimate: {
      type: 'string',
      title: 'Effort (hrs)',
    },
    currency: {
      type: 'string',
      title: 'Currency',
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
    workflowStatus: {
      type: 'string',
      title: 'Workflow-Status',
      // This needs to be a data lookup per project board.
      // custom list of workflow-status keys
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
        format: 'uri',
      },
    },
  },
};
