import mongoose from 'mongoose';

// const { ObjectId } = mongoose.Schema.Types;

const OrganizationSchema = mongoose.Schema({
  code: String,
  name: String,
  logo: String,
  businessUnits: [String],
  legacyId: String,
  createdAt: Date,
  updatedAt: Date,
});

const OrganizationModel = mongoose.model('Organization', OrganizationSchema);
export default OrganizationModel;
