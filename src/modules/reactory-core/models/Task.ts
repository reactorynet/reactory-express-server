import mongoose from 'mongoose';

const { ObjectId, Mixed } = mongoose.Schema.Types;

/**
 * Defaults:
 *
 * workflowStatus: initiated, 25%, 50%, 75%, awaiting another task, delayed
 */

export interface ITaskDocument extends mongoose.Document {
  id: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  shortCodeId?: number;
  title?: string;
  description?: string;
  percentComplete?: number;
  slug?: string;
  label?: string[];
  category?: string;
  workflowStatus?: string;
  status?: string;
  externalUrls?: string[];
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  links?: Array<{
    linkId?: mongoose.Types.ObjectId;
    linkedTo?: string;
    linkType?: string;
  }>;
  workflowId?: string;
  instanceId?: string;
  stepId?: string;
  stepNumber?: number;
  componentFqn?: string;
  componentProps?: any;
  formSchemaId?: string;
  resultData?: any;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new mongoose.Schema({
  id: ObjectId,
  project: {
    type: ObjectId,
    ref: 'Project',
  },
  shortCodeId: Number,
  title: String,
  description: String,
  percentComplete: Number,
  slug: String,
  label: [String],
  category: String,
  workflowStatus: String,
  status: {
    type: String,
    default: 'pending',
  },
  externalUrls: [String],
  startDate: Date,
  dueDate: Date,
  completionDate: Date,
  links: [
    {
      linkId: ObjectId,
      linkedTo: String,
      linkType: String,
    },
  ],
  // Workflow and Human-in-the-Loop properties
  workflowId: String,
  instanceId: String,
  stepId: String,
  stepNumber: Number,
  componentFqn: String,
  componentProps: Mixed,
  formSchemaId: String,
  resultData: Mixed,
  user: {
    required: true,
    type: ObjectId,
    ref: 'ReactoryUser',
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const TaskModel = mongoose.model<ITaskDocument>('Task', TaskSchema, 'reactory_tasks');
export default TaskModel;
