import mongoose from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Raw schema shape for a Team.
 *
 * The published `Reactory.Models.ITeam` interface only declares `title`,
 * `name`, `description`, `avatar` and `deleted`; the Mongoose schema also
 * persists ownership, organization and membership references. Intersecting the
 * published interface with the additional stored fields keeps the schema
 * strongly typed without falling back to `any` or editing node_modules. The
 * published interface should be widened upstream (tracked as part of ORG-001).
 */
type TeamSchemaType = Reactory.Models.ITeam & {
  owner?: mongoose.Types.ObjectId;
  organization?: mongoose.Types.ObjectId;
  businessUnit?: mongoose.Types.ObjectId;
  members?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

const TeamSchema = new mongoose.Schema<TeamSchemaType>({
  title: String,
  name: {
    type: String,
    default: function() {
      return this.title
    }
  },
  // Written by OrganizationService.updateTeam and the Teams tab.
  description: String,
  avatar: String,
  owner: {
    type: ObjectId,
    ref: 'User',
  },
  organization: {
    type: ObjectId,
    ref: 'Organization',
  },
  businessUnit: {
    type: ObjectId,
    ref: 'BusinessUnit',
  },
  members: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  deleted: {
    type: Boolean,
    default: false,
  },
  createdAt: Date,
  updatedAt: Date,
});

// Team lookups are always scoped by organization and/or business unit, and
// listings filter on the soft-delete flag.
TeamSchema.index({ organization: 1 });
TeamSchema.index({ businessUnit: 1 });
TeamSchema.index({ deleted: 1 });

TeamSchema.statics.GetAllTeams = async function GetAllTeams() {
  return await this.find();
};

const TeamModel = mongoose.model<Reactory.Models.ITeamDocument>('Team', TeamSchema, 'reactory_teams');
export default TeamModel;
