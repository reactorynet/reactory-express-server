import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Defaults:
 *
 * workflowStatus: initiated, 25%, 50%, 75%, awaiting another task, delayed
 */

const TaskSchema = new mongoose.Schema({
  id: ObjectId,
  project: {
    type: ObjectId,
    ref: 'Project',
  },
  shortCodeId: Number, // https://app.ageofteams.com/tasks/aot/00000001
  title: String,
  description: String,
  percentComplete: Number,
  slug: String,
  label: [String],
  category: String,
  workflowStatus: String,
  status: String,
  externalUrls: [String],
  startDate: Date,
  dueDate: Date,
  completionDate: Date,
  links: [
    {
      linkId: ObjectId,
      linkedTo: String,
      linkType: String, // task etc.
    }, // done in planned section
  ],
  user: {
    required: true,
    type: ObjectId,
  }, // assigned user
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});


const TaskModel = mongoose.model('Task', TaskSchema);
export default TaskModel;
