import workflow from '../schemas/workflow';

const formSchema: Reactory.Schema.IFormSchema = { 
  type: 'object',
  title: 'Workflow Details',
  properties: {
    workflow
  },
}

export default formSchema;