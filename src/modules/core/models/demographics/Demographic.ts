import { Schema, model, Document } from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';



const DemographicsSchema: Schema<Reactory.Models.IDemographicDocument> = new Schema<Reactory.Models.IDemographicDocument>({
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    lowercase: true,
  },
  key: {
    type: String,
    required: true,
    lowercase: true,
  },
  icon: String,
  deleted: {
    type: Boolean,
    required: true,
    default: false,
  }
});


const Demographic = model<Reactory.Models.IDemographicDocument>('Demographic', DemographicsSchema);

export default Demographic;