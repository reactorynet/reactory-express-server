import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const OrganizationSchema = mongoose.Schema({
  id: ObjectId,
  code: String,
  name: String,
  logo: String,
  businessUnits: [
    {
      type: ObjectId,
      ref: 'BusinessUnit',
    },
  ],
  public: Boolean,
  clients: {
    active: [String],
    denied: [String],
  },
  legacyId: String,
  createdAt: Date,
  updatedAt: Date,
  settings: [
    {
      name: String,
      componentFqn: String,
      data: { },
    },
  ],
  updateBy: {
    type: ObjectId,
    ref: 'User',
  },
});

OrganizationSchema.methods.isPublic = function isPublic() {
  return this.public === true;
};

OrganizationSchema.methods.clientActive = function clientActive(clientKey) {
  if (this.isPublic() === true) return true; // is public organization
  let keyFound = null;
  if (this.clients) {
    // first check denied list
    keyFound = Array.find(this.clients.denied, (key) => { return key === clientKey; });
    if (keyFound) return false;

    // then check allowed list
    keyFound = Array.find(this.clients.active, (key) => { return key === clientKey; });
    if (keyFound) return true;

    return false;
  }

  return false;
};


const OrganizationModel = mongoose.model('Organization', OrganizationSchema);
export default OrganizationModel;
