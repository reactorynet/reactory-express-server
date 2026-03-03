import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Schema for a menu entry item. Supports n-level nesting
 * via a self-referencing `items` field added after definition.
 */
const MenuEntrySchema = new mongoose.Schema({
  id: ObjectId,
  ordinal: Number,
  title: String,
  link: String,
  external: Boolean,
  icon: String,
  image: String,
  roles: [String],
  enabled: {
    type: Boolean,
    default: true,
  },
  featureFlags: [String],
});

// Self-reference to support n-level nested menu items
MenuEntrySchema.add({
  items: [MenuEntrySchema],
});

const MenuItemSchema = new mongoose.Schema({
  id: ObjectId,
  ordinal: Number,
  title: String,
  link: String,
  external: Boolean,
  icon: String,
  image: String,
  roles: [String],
  enabled: {
    type: Boolean,
    default: true,
  },
  featureFlags: [String],
});

// Self-reference to support n-level nested menu items
MenuItemSchema.add({
  items: [{ type: ObjectId, ref: 'MenuItem' }],
});

export const MenuItemModel = mongoose.model('MenuItem', MenuItemSchema, 'reactory_menu_items');

const MenuSchema = new mongoose.Schema({
  id: ObjectId,
  key: {
    type: String,
    lowercase: true,
  },
  client: {
    type: ObjectId,
    ref: 'ReactoryClient',
  },
  entries: [MenuEntrySchema],
  name: String,
  target: String,
  icon: String,
  roles: [String],
  enabled: {
    type: Boolean,
    default: true,
  },
  featureFlags: [String],
  createdAt: Date,
  updatedAt: Date,
});

MenuSchema.index({ client: 1, key: -1 });
const MenuModel = mongoose.model('Menu', MenuSchema, 'reactory_menus');
export default MenuModel;
