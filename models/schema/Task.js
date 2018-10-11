import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;


const TaskSchema = new mongoose.Schema({
  id: ObjectId,
  title: String,
  description: String,
  percentComplete: Number,
  status: String,
  links: [
    {
      linkId: ObjectId,
      linkedTo: String,
    },
  ],
  user: {
    required: true,
    type: ObjectId,
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


const TaskModel = mongoose.model('Task', TaskSchema);
export default TaskModel;
