import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

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
});

QuoteReminderShema.statics.findRemindersForQuote = async (quote) => {
  return QuoteReminder.find({ quote: quote.id }).then();
};

export const QuoteReminder = mongoose.model('QuoteReminder', QuoteReminderShema);

const QuoteSchema = new mongoose.Schema({
  id: ObjectId,
  company: {
    type: ObjectId,
    ref: 'Organization',
  },
  status: String,
  code: String, // https://siteurl/quote/00000001
  note: String,
  meta: {
    owner: String, // indicates what system owns this record
    reference: String,
    sync: String,
    lastSync: Date,
    mustSync: {
      type: Boolean,
      default: true,
    },
  },
  user: {
    required: true,
    type: ObjectId,
    ref: 'User',
  }, // assigned user
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

export default {
  QuoteReminder,
  Quote,
};
