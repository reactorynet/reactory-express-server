import { defaultFormProps } from '@reactory/server-core/data/forms/defs';

/**
 * Represents a basic Project Structure
 */
export const ProjectDetailSchema = {
  title: 'Project',
  type: 'object',
  required: [
    'title',
  ],
  properties: {
    id: {
      type: 'string',
      title: 'id',
    },
    boards: {
      type: 'array',
      title: 'Boards',
      items: {
        type: 'string',
        title: 'Board',
      },
    },
    title: {
      type: 'string',
      title: 'Title',
    },
    description: {
      type: 'string',
      title: 'Description',
    },
    mileStones: {
      type: 'array',
      title: 'Mile Stones',
      items: {
        type: 'object',
        title: 'Mile Stone',
        properties: {
          title: {
            type: 'string',
            title: 'Title',
          },
          description: {
            type: 'string',
            title: 'Description',
          },
          dueDate: {
            type: 'string',
            format: 'date',
            title: 'Due Date',
          },
          tasks: {
            type: 'array',
            title: 'Associated Tasks',
            items: {
              type: 'string',
              title: 'Task Id',
            },
          },
        },
      },
    },
  },
};


export const ProjectForm = {
  id: 'PojectForm',
  ...defaultFormProps,
  name: 'PojectForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: true,
  schema: ProjectDetailSchema,
  uiSchema: {

  },
};


export default ProjectForm;