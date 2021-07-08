import mongoose from 'mongoose';
import { Reactory } from '@reactory/server-core/types/reactory';

const { ObjectId } = mongoose.Schema.Types;

const meta = new mongoose.Schema<Reactory.IRecordMeta>({
  source: {},
  owner: String, // indicates what system owns this record
  reference: String, // a lookup string to use for the remote system
  sync: String,
  lastSync: Date,
  mustSync: {
    type: Boolean,
    default: true,
  },
});

const OrganizationSchema = new mongoose.Schema<Reactory.IOrganization>({
  id: ObjectId,
  code: String,
  name: String,
  tradingName: String,
  logo: String,
  avatar: String,
  businessUnits: [
    {
      type: ObjectId,
      ref: 'BusinessUnit',
    },
  ],
  teams: [
    {
      type: ObjectId,
      ref: 'Team',
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
      data: {},
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

OrganizationSchema.methods.clientActive = function clientActive(clientKey: string) {
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

OrganizationSchema.statics.findByForeignId = async function findByForeignId(id, owner) {
  return await this.findOne({ 'meta.code': id, 'meta.owner': owner }).then();
};

OrganizationSchema.methods.getSetting = function getSettings(name) {
  let _setting = null;

  if (!this.settings) return null;
  if (this.settings.length === 0) return null;
  if (this.settings && this.settings.length > 0) {
    this.settings.forEach((setting) => {
      if (setting.name === name && _setting === null) {
        _setting = setting;
      }
    });
  }

  return _setting;
};

OrganizationSchema.methods.setSetting = function getSettings(name, data, componentFqn) {
  let _idx = null;

  if (!this.settings) this.settings = [];
  if (this.settings.length === 0) return null;
  if (this.settings && this.settings.length > 0) {
    this.settings.forEach((setting, idx) => {
      if (setting.name === name) {
        _idx = idx;
      }
    });
  }

  if (_idx >= 0) {
    this.settings[_idx].data = data;
    this.settings[_idx].componentFqn = componentFqn || this.settings[_idx].componentFqn;
  } else {
    _idx = this.settings.push({ name, data, componentFqn });
    _idx -= 1;
  }

  return this.settings[_idx];
};


const OrganizationModel = mongoose.model<Reactory.IOrganizationDocument>('Organization', OrganizationSchema);
export default OrganizationModel;
