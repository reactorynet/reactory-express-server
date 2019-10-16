import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const meta = new mongoose.Schema({
  source: { },
  owner: String, // indicates what system owns this record
  reference: String, // a lookup string to use for the remote system
  sync: String,
  lastSync: Date,
  mustSync: {
    type: Boolean,
    default: true,
  },
});

const OrganizationSchema = mongoose.Schema({
  id: ObjectId,
  code: String,
  name: String,
  tradingName: String,
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
  meta,
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

OrganizationSchema.statics.findByForeignId = async function findByForeignId(id, owner){
  return await this.findOne({ 'meta.code' : id, 'meta.owner':  owner}).then();
};


const OrganizationModel = mongoose.model('Organization', OrganizationSchema);
export default OrganizationModel;
