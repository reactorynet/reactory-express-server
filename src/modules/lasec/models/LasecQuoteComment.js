import mongoose from 'mongoose';

const LasecQuoteCommentSchema = mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  who: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  quoteId: String,
  comment: {
    type: String,
  },
  when: Date,
});

const LasecQuoteCommentModel = mongoose.model('LasecQuoteComment', LasecQuoteCommentSchema);

export default LasecQuoteCommentModel;
