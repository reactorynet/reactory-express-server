/* eslint-disable max-len */
import mongoose from 'mongoose';
import * as mongodb from 'mongodb';

const ObjectIdFunc = mongodb.ObjectId;
const { ObjectId } = mongoose.Schema.Types;

const UserDemographicSchema = new mongoose.Schema({
    membership: {
        type: ObjectId,
        ref: 'Membership'
    },
    organization: {
        type: ObjectId,
        ref: 'Organization'
    },
    user: {
        type: ObjectId,
        ref: 'User'
    },
    gender: {
        type: ObjectId,
        ref: 'Demographic'
    },
    race: {
        type: ObjectId,
        ref: 'Demographic'
    },
    position: {
        type: ObjectId,
        ref: 'Demographic'
    },
    operationalGroup: {
        type: ObjectId,
        ref: 'Demographic'
    },
    region: {
        type: ObjectId,
        ref: 'Region'
    },
    businessUnit: {
        type: ObjectId,
        ref: 'BusinessUnit'
    },
    team: {
        type: ObjectId,
        ref: 'Team'
    }
})

UserDemographicSchema.statics.updateDemographic = async function updateDemographic(userID: string | mongodb.ObjectId, demographic: String, value: String | '') {
    if (ObjectIdFunc.isValid(userID)) {
        const data = { [`${demographic}`]: value }
        const _d = await this.findOneAndUpdate({ user: userID }, data, { new: true })
        //@ts-ignore

        return { demographic: demographic, ...value }
    }
    return false
}

const UserDemographicsModel = mongoose.model('UserDemographic', UserDemographicSchema, 'reactory_user_demographics');
export default UserDemographicsModel;
