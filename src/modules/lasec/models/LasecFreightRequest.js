import mongoose from 'mongoose';

const LasecFreightRequestSchema = mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  quoteId: String,
  email: String,
  communicationMethod: String,
  options: [
    {
      id: String,
      transportMode: String,
      incoTerm: String,
      place: String,
      vatExempt: Boolean,
      vieRoadFreight: Boolean,
      totalValue: Number,
      companyName: String,
      streetAddress: String,
      suburb: String,
      city: String,
      province: String,
      country: String,
      freightFor: String,
      offloadingRequired: Boolean,
      hazardous: String,
      refrigerationRequired: Boolean,
      containsLithium: Boolean,
      sampleOrRepair: String,
      additionalDetails: String,
    },
  ],
  productDetails: [
    {
      id: mongoose.Schema.Types.ObjectId,
      quantity: Number,
    },
  ],
});

const LasecFreightRequestModel = mongoose.model('LasecFreightRequest', LasecFreightRequestSchema);

export default LasecFreightRequestModel;
