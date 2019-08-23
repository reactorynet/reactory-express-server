import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const meta = new mongoose.Schema({
  source: { },
  owner: String, // indicates what system owns this record
  reference: String, // a lookup string to use for the remote system
  sync: String,
  lastSync: Date,
  mustSync: {
    type: Boolean,
    default: true,
  },
});

const QuoteReminderShema = new mongoose.Schema({
  id: ObjectId,
  quote: {
    type: ObjectId,
    ref: 'Quote',
  },
  who: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  next: Date,
  actioned: Boolean,
  result: {

  },
  via: String,
  meta,
});

QuoteReminderShema.statics.findRemindersForQuote = async (quote) => {
  return QuoteReminder.find({ quote: quote.id }).then();
};

export const QuoteReminder = mongoose.model('QuoteReminder', QuoteReminderShema);


const QuoteHeaderSchema = new mongoose.Schema({
  id: ObjectId,
  quote: {
    type: ObjectId,
    ref: 'Quote',
  },
  quoteItems: [{
    type: ObjectId,
    ref: 'QuoteItem',
  }],
  title: String,
  ordinal: Number,
  meta,
});

export const QuoteHeader = mongoose.model('QuoteHeader', QuoteHeaderSchema);

const QuoteSchema = new mongoose.Schema({
  id: ObjectId,
  company: {
    type: ObjectId,
    ref: 'Organization',
  },
  status: String,
  code: String, // https://siteurl/quote/00000001
  note: String,
  meta,
  user: {
    required: true,
    type: ObjectId,
    ref: 'User',
  }, // assigned user
  salesRep: {
    required: true,
    type: ObjectId,
    ref: 'User',
  },
  headers: [
    {
      type: ObjectId,
      ref: 'QuoteHeader',
    },
  ],
  items: [
    {
      type: ObjectId,
      ref: 'QuoteItem',
    },
  ],
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
  timeline: [{
    when: Date,
    what: String,
    who: {
      type: ObjectId,
      ref: 'User',
    },
    notes: String,
    reason: String,
    reminder: {
      type: ObjectId,
      ref: 'QuoteReminder',
    },
  }],
});


export const Quote = mongoose.model('Quote', QuoteSchema);

const QuoteItemSchema = new mongoose.Schema({
  id: ObjectId,
  ordinal: {
    type: Number,
    default: 0,
  },
  quote: {
    type: ObjectId,
    ref: 'Quote',
  },
  header: {
    type: ObjectId,
    ref: 'QuoteHeader',
    required: false,
  },
  sku: String,
  title: String,
  quantity: Number,
  price: Number,
  subtotal: Number,
  totalExcTax: Number,
  totalIncTax: Number,
  taxRate: Number,
  grossProfit: Number,
  meta,
});

export const QuoteItem = mongoose.model('QuoteItem', QuoteItemSchema);

export default {
  Quote,
  QuoteItem,
  QuoteHeader,
  QuoteReminder,
};
