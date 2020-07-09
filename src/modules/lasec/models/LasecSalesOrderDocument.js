import mongoose from 'mongoose';

const LasecSalesOrderDocumentSchema = mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  slug: String,
  topics: [String],
  title: String,
  content: String,
  createdAt: Date,
  updatedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId,
  },
  published: Boolean,
  comments: [mongoose.Schema.Types.ObjectId]
});

const LasecSalesOrderDocumentModel = mongoose.model('LasecSalesOrderDocument', LasecSalesOrderDocumentSchema);

export default LasecSalesOrderDocumentModel;
