/* eslint-disable max-len */
import mongoose, { MongooseDocument, Schema } from 'mongoose';
import * as lodash from 'lodash';
import { readFileSync, existsSync } from 'fs';
import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';


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
  firstRow: {
    type: String,
    default: 'header',
  },
  columnMappings: [ColumnMappingSchema],
});

const UserPreviewSchema = new mongoose.Schema({
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
  serviceFqn: String,
  order: Number,
  started: Date,
  finished: Date,
  status: String,
  fields: [String],
  responses: [{ line: Number, error: String }],
});

ImportProcessorSchema.methods.addError = function addError(line: number, error: string) {
  if (!this.responses) this.responses = [];
  this.responses.push({ line, error });
};

const ImportFileSchema: mongoose.Schema<Reactory.IImportFile> = new mongoose.Schema<Reactory.IImportFile>({
  file: { type: ObjectId, ref: 'ReactoryFile' },
  preview: [UserPreviewSchema],
  options: FileOptionsSchema,
  status: String,
  processors: [ImportProcessorSchema],
  rows: Number,
});

const ReactoryFileImportPackageSchema: mongoose.Schema<Reactory.IReactoryFileImportPackage> = new mongoose.Schema<Reactory.IReactoryFileImportPackage>({
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
  /**
   * Default file options
   */
  options: FileOptionsSchema,
  /**
   * File list for the package
   */
  files: [ImportFileSchema],
  /**
   * status for the package.
   */
  status: {
    type: String,
    default: 'added',
  },
  /**
   * Processors for the items.
   */
  processors: [ImportProcessorSchema],
  /**
   * Indicates whether the package is done 
   */
  completed: { type: Boolean, default: false },
  response: {
    type: ObjectId,
    ref: 'ReactoryFile',
  },
});

const ReactoryFileImportPackage = mongoose.model<Reactory.IReactoryFileImportPackageDocument>('ReactoryFileImportPackage', ReactoryFileImportPackageSchema);
export default ReactoryFileImportPackage;
