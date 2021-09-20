import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Defaults:
 *
 * workflowStatus: initiated, 25%, 50%, 75%, awaiting another task, delayed
 */

const ThemeSchema = new mongoose.Schema({
  id: ObjectId,
  project: {
    type: ObjectId,
    ref: 'Project',
  },
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  title: String,
  description: String,
  resources: [
    {
      framework: String,
      resourceType: String,
      resourceUri: String,
      loadAsync: Boolean,
      name: String,
      loadOrder: Number,
    },
  ],
  themeOptions: { },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});


const ThemeModel = mongoose.model('Theme', ThemeSchema);
export default ThemeModel;
