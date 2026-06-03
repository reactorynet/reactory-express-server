const WorkflowFormQuery: Reactory.Forms.IReactoryFormQuery = {
  name: "WorkflowDetails",
  text: `query WorkflowDetails(id: String!) {
    workflowWithId(id: $id) { 
      id
      name
      nameSpace
      version
      description
      tags
      author
      createdAt
      updatedAt
      status
      isActive
      hasSchedule
      workflowType
      location
      dependencies {
        id
        name
        nameSpace
        type
        version
        optional
        description
      }
      statistics {
        totalExecutions
        successfulExecutions
        failedExecutions
        averageExecutionTime
      }
    }`,
  variables: { 
    'formData.id': 'id'
  },
  resultType: 'object',
  resultMap: {
    'workflowWithId': 'data'
  }
};

const WorkflowDetailsGraphDefinition: Reactory.Forms.IFormGraphDefinition = { 
  query: WorkflowFormQuery,
};