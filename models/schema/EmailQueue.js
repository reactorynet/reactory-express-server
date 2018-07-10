import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const EmailQueueSchema = mongoose.Schema({
  id: ObjectId,
  sendAfter: Date,
  sentAt: Date,
  sent: Boolean,
  error: String,
  failures: Number,
  from: String,
  message: String,
  subject: String,
  to: String,
  archived: Boolean,
  createdAt: Date,
  format: String,
  user: {
    type: ObjectId,
    ref: 'User',
  },
  survey: {
    type: ObjectId,
    ref: 'Survey',
  },
});

const EmailQueueModel = mongoose.model('EmailQueue', EmailQueueSchema);
export default EmailQueueModel;
