import mongoose from 'mongoose';
import logger from '../../logging';

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
  postalService: String,
  engagements: [
    {
      when: Date,
      what: String,
      meta: {},
    },
  ],
  client: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  user: {
    type: ObjectId,
    ref: 'User',
  },
  survey: {
    type: ObjectId,
    ref: 'Survey',
  },
});

EmailQueueSchema.index({ 'to': 'text', 'from': 'text', 'subject': 'text', 'message': 'text' });
EmailQueueSchema.statics.UserEmailsWithTextSearch = async function(user, filter){
  try {
    logger.debug(`Searching user email ${user.fullName(true)}`, filter);
    return await this.find({
      $text: { $search: filter.search },
      user: user ? user._id : global.user._id,
    })
    .limit(filter.size || 10)
    .skip((filter.page || 0) * (filter.size || 10))
    .then();
  } catch (emailSearchError) {
    logger.error('Could not retrieve local mail queue');
    return [];
  }  
};

const EmailQueueModel = mongoose.model('EmailQueue', EmailQueueSchema);
export default EmailQueueModel;
