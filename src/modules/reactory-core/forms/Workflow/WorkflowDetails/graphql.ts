const WorkflowFormQuery: Reactory.Forms.IReactoryFormQuery = {
  name: "workflowWithId",
  text: `query WorkflowDetails($id: String!) {
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
    }
}`,
  variables: {
      'props.workflowId': 'id'
    },
  resultType: 'object',
   resultMap: {
       'id': 'workflow.id',
       'name': 'workflow.name',
       'nameSpace': 'workflow.nameSpace',
       'version': 'workflow.version',
       'description': 'workflow.description',
       'tags': 'workflow.tags',
       'author': 'workflow.author',
       'createdAt': 'workflow.createdAt',
       'updatedAt': 'workflow.updatedAt',
       'status': 'workflow.status',
       'isActive': 'workflow.isActive',
       'hasSchedule': 'workflow.hasSchedule',
       'workflowType': 'workflow.workflowType',
       'location': 'workflow.location',
       'dependencies': 'workflow.dependencies',
       'statistics': 'workflow.statistics',
      },
};

const WorkflowDetailsGraphDefinition: Reactory.Forms.IFormGraphDefinition = {
  query: WorkflowFormQuery,
};

export default WorkflowDetailsGraphDefinition;
