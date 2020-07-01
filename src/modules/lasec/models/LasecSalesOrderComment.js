import mongoose from 'mongoose';

const LasecSalesOrderCommentSchema = mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  who: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  salesOrderId: String,
  comment: {
    type: String,
  },
  when: Date,
});

const LasecSalesOrderCommentModel = mongoose.model('LasecSalesOrderComment', LasecSalesOrderCommentSchema);

export default LasecSalesOrderCommentModel;
