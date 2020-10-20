import mongoose from 'mongoose';
import lodash from 'lodash';

const { ObjectId } = mongoose.Schema.Types;

const meta = new mongoose.Schema({
  source: { },
  owner: String, // indicates what system owns this record
  reference: String, // a lookup string to use for the remote system
  sync: String,
  lastSync: Date,
  nextSync: Date,
  mustSync: {
    type: Boolean,
    default: true,
  },
});

const QuoteReminderMeta = new mongoose.Schema({
  reference: {
    source: String,
    referenceId: String
  },
  lastSync: Date,
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
  actionType: String,
  actioned: Boolean,
  result: { },
  via: [String],
  text: String,
  importance: String,
  meta: QuoteReminderMeta
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

const totals = new mongoose.Schema({
  totalVATExclusive: {
    type: Number,
    required: true,
  },
  totalVAT: {
    type: Number,
    required: true,
  },
  totalVATInclusive: {
    type: Number,
    required: true,
  },
  totalDiscount: {
    type: Number,
    required: true,
  },
  totalDiscountPercent: {
    type: Number,
    required: true,
  },
  GP: {
    type: Number,
    required: true,
  },
  actualGP: {
    type: Number,
    required: true,
  }
});


export const QuoteHeader = mongoose.model('QuoteHeader', QuoteHeaderSchema);


const QuoteSchema = new mongoose.Schema({
  id: ObjectId,
  company: {
    type: ObjectId,
    ref: 'Organization',
  },
  customer: {
    type: ObjectId,
    ref: 'User',
  },
  statusGroup: String,
  statusGroupName: String,
  status: String,
  statusName: String,
  allowedStatus: [String],
  code: String, // https://siteurl/quote/00000001
  note: String,
  meta,
  user: {
    required: false,
    type: ObjectId,
    ref: 'User',
  }, // assigned user
  salesRep: {
    required: false,
    type: ObjectId,
    ref: 'User',
  },
  salesTeam: {
    required: false,
    type: ObjectId,
    ref: 'Team'
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
  totals,
  options: [{
    id: String,
    incoterm: String,
    named_place: String,
    transport_mode: String,
    currency: String,
    active: Boolean,
    syncedAt: Date
  }],
  created: {
    type: Date,
    required: true,
  },
  modified: {
    type: Date,
    required: true,
  },
  actions: [
    {

    }
  ],
  timeline: [{
    when: Date,
    what: String,
    actionType: String,
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

QuoteSchema.methods.addTimelineEntry = async function addTimelineEntry(entry){
  if(lodash.isEmpty(this.timeline) === false) {
    this.timeline = [entry];
  } else {
    this.timeline.push(entry);
  }

  await this.save();
};

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
