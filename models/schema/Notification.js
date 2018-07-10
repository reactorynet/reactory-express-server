import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const NotificationSchema = mongoose.Schema({
  id: ObjectId,
  user: {
    type: ObjectId,
    ref: 'User',
  },
  title: String,
  text: String,
  link: String,
  createdAt: Date,
  read: Boolean,
  details: { },
});

const NotificationModel = mongoose.model('Notification', NotificationSchema);
export default NotificationModel;
