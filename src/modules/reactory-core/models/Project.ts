import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Project / Board
 *
 */

const ProjectSchema = new mongoose.Schema({
  id: ObjectId,
  // title: String,
  name: String,
  description: String,
  vision: String,
  goals: [String],
  percentComplete: Number,
  slug: String,
  shortCode: String, // AOT-00000001
  label: [String],
  externalUrls: [String],
  deleted: Boolean,
  tasks: [
    {
      type: ObjectId,
      ref: 'Task',
    },
  ],
  members: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  owner: {
    required: true,
    type: ObjectId,
    ref: 'User', // The Team Leader
  },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});


const ProjectModel = mongoose.model('Project', ProjectSchema, 'reactory_projects');
export default ProjectModel;
