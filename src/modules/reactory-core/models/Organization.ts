import mongoose from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId, Mixed } = mongoose.Schema.Types;

/**
 * Lifecycle states for an organization.
 *
 * `active`    - normal operating state.
 * `suspended` - access is withheld but the record and its data are retained.
 * `archived`  - the organization is retired; hidden from default listings.
 */
export const ORGANIZATION_STATUSES = ['active', 'suspended', 'archived'] as const;

export type OrganizationStatus = typeof ORGANIZATION_STATUSES[number];

/**
 * Theme selection mode for an organization. `os` follows the end user's
 * operating system preference.
 */
export const ORGANIZATION_THEME_MODES = ['light', 'dark', 'os'] as const;

export type OrganizationThemeMode = typeof ORGANIZATION_THEME_MODES[number];

/**
 * Meta data entry for a organization record.
 */
const meta = new mongoose.Schema<Reactory.Models.IRecordMeta<unknown>>({
  source: {},
  owner: String, // indicates what system owns this record
  reference: String, // a lookup string to use for the remote system
  lastSync: Date,
  nextSync: Date,
  expires: Date,
  mustSync: {
    type: Boolean,
    default: true,
  },
  provider: String,
  options: {},
});

/**
 * Organization schema
 */
const OrganizationSchema = new mongoose.Schema<Reactory.Models.IOrganization>({
  id: ObjectId,
  code: String,
  name: String,
  tradingName: String,
  // Identity fields used by the organization configuration experience.
  legalName: String,
  description: String,
  website: String,
  contactEmail: String,
  contactPhone: String,
  logo: String,
  avatar: String,
  // Lifecycle
  status: {
    type: String,
    enum: ORGANIZATION_STATUSES,
    default: 'active',
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  // Branding. `themes` deliberately mirrors `ReactoryClient.themes` ([Mixed]) so
  // the same theme documents and editor can be reused (design decision D1).
  theme: String,
  themeMode: {
    type: String,
    enum: ORGANIZATION_THEME_MODES,
    default: 'dark',
  },
  themes: [Mixed],
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
  // Audit. `updateBy` predates `updatedBy` and is kept for backwards
  // compatibility with existing records and queries.
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User',
  },
  updateBy: {
    type: ObjectId,
    ref: 'User',
  },
});

// Lookup indexes for the organization list, filters and soft-delete scoping.
OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ deleted: 1 });

// Compound index for "is this code unique within the clients that can see the
// organization" lookups.
//
// It is intentionally NOT unique. `code` is optional, and a unique multikey
// index over { 'clients.active': 1, code: 1 } collides for every legacy
// document that has no code and an empty/absent `active` array (all of them
// index the same null key), which would fail index creation on existing data.
// Enforcing per-client code uniqueness therefore needs a partial index scoped
// to documents where `code` exists, plus a data clean-up pass - follow-up work,
// not a schema-only foundation ticket.
OrganizationSchema.index({ 'clients.active': 1, code: 1 });

OrganizationSchema.methods.isPublic = function isPublic() {
  return this.public === true;
};

OrganizationSchema.methods.clientActive = function clientActive(clientKey: string) {
  const that: Reactory.Models.IOrganizationDocument = (this as Reactory.Models.IOrganizationDocument);
  if (that.isPublic() === true) return true; // is public organization
  let keyFound = null;
  
  if(that.clients && that.clients.denied) {
    keyFound = that.clients.denied.find((key: string) => key === clientKey);
    if(keyFound) return false;
  }

  if(that.clients && that.clients.active) {
    keyFound = that.clients.active.find((key: string) => key === clientKey);
    if(keyFound) return true;
  }


  return false;
};

OrganizationSchema.statics.findByForeignId = async function findByForeignId(id, owner) {
  return await this.findOne({ 'meta.code': id, 'meta.owner': owner }).then();
};

OrganizationSchema.methods.getSetting = function getSettings(name: string): Reactory.Models.IOrganizationSetting {
  let _setting: Reactory.Models.IOrganizationSetting = null;

  if (!this.settings) return null;
  if (this.settings.length === 0) return null;
  if (this.settings && this.settings.length > 0) {
    this.settings.forEach((setting: Reactory.Models.IOrganizationSetting) => {
      if (setting.name === name && _setting === null) {
        _setting = setting;
      }
    });
  }

  return _setting;
};

OrganizationSchema.methods.setSetting = function getSettings(name: string, data: any, componentFqn: string) {
  let _idx: number = null;

  if (!this.settings) this.settings = [];
  if (this.settings.length === 0) return null;
  if (this.settings && this.settings.length > 0) {
    this.settings.forEach((setting: { name: string; }, idx: any) => {
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


const OrganizationModel = mongoose.model<Reactory.Models.IOrganizationDocument>('Organization', OrganizationSchema, 'reactory_organizations');
export default OrganizationModel;
