export default {
  title: 'Task Details',
  type: 'object',
  required: [
    'title',
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
      type: 'number',
      title: 'This is the new cost field',
    },
    effortEstimate: {
      type: 'number',
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
