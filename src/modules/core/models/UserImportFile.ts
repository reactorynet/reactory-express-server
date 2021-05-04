/* eslint-disable max-len */
import mongoose, { MongooseDocument } from 'mongoose';
import * as lodash from 'lodash';
import { readFileSync, existsSync } from 'fs';
import logger from '@reactory/server-core/logging';
import { Reactory } from '@reactory/server-core/types/reactory';


const { ObjectId } = mongoose.Schema.Types;

const ColumnMappingSchema = new mongoose.Schema({
  sourceIndex: Number,
  fieldName: String,
});

const FileOptionsSchema = new mongoose.Schema({
  delimeter: {
    type: String,
    default: ',',
  },
  textQualifier: String,
  firstRow: { type: String, default: 'header' },
  columnMappings: [ColumnMappingSchema],
});

const UserPreviewSchema = new mongoose.Schema({
  id: String,
  firstName: String,
  lastName: String,
  email: String,
  dob: String,
  gender: String,
  race: String,
  position: String,
  region: String,
  legalEntity: String,
  businessUnit: String,
  team: String,
});

const ImportProcessorSchema = new mongoose.Schema({
  name: String,
  order: Number,
  started: Date,
  finished: Date,
  responses: [{ line: Number, error: String }],
});

ImportProcessorSchema.methods.addError = function addError(line: number, error: string) {
  if (!this.responses) this.responses = [];
  this.responses.push({ line, error });
};

const UserImportFileUploadSchema = new mongoose.Schema<Reactory.IUserImportFile>({
  id: ObjectId,
  organization: {
    type: ObjectId,
    required: true,
    ref: 'Organization',
  },
  owner: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  options: FileOptionsSchema,
  files: [
    { type: ObjectId, ref: 'ReactoryFile' },
  ],
  status: {
    type: String,
    default: 'added',
  },
  processors: [ImportProcessorSchema],
  preview: [UserPreviewSchema],
  completed: { type: Boolean, default: false },
  rows: { type: Number, default: 0 },
  response: {
    type: ObjectId,
    ref: 'ReactoryFile',
  },
});


const UserImportFile = mongoose.model('UserImportFile', UserImportFileUploadSchema);
export default UserImportFile;
