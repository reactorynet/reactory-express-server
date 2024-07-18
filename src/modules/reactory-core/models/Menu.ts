import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const MenuItemSchema = new mongoose.Schema({
  id: ObjectId,
  ordinal: Number,
  title: String,
  link: String,
  external: Boolean,
  icon: String,
  roles: [String],
  items: [
    {
      type: ObjectId,
      ref: 'MenuItem'
    }
  ]
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
  entries: [
    {
      id: ObjectId,
      ordinal: Number,
      title: String,
      link: String,
      external: Boolean,
      icon: String,
      items: [
        {
          id: ObjectId,
          ordinal: Number,
          title: String,
          link: String,
          external: Boolean,
          icon: String,
          roles: [String],
        },
      ],
      roles: [String],
    },
  ],
  name: String,
  target: String,
  icon: String,
  roles: [String],
  createdAt: Date,
  updatedAt: Date,
});

MenuSchema.index({ client: 1, key: -1 });
const MenuModel = mongoose.model('Menu', MenuSchema, 'reactory_menus');
export default MenuModel;
