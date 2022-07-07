import { Schema } from 'mongoose';


export const MetaSchema = new Schema<Reactory.Models.IRecordMeta<any>>({
  owner: String,
  mustSync: Boolean,
  nextSync: Date,
  options: {},
  provider: String,
  source: {},
  reference: String,
  lastSync: Date,
  expires: Date
});

export const UXMetaSchema = new Schema<Reactory.UX.UXMeta>({
  avatar: String,
  backgroundColor: String,
  backgroundImage: String,
  className: String,
  color: String,
  font: String,
  fontSize: String,
  fontStyle: String,
  icon: String,
  jss: {},
  styled: {}
});

export const ThemedUXMetaSchema = new Schema<Reactory.UX.IThemedUXMeta>({
  mode: String,
  theme: String,
  uxmeta: UXMetaSchema
})