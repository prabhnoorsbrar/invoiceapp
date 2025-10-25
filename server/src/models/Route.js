import mongoose from "mongoose";
const PriceSchema = new mongoose.Schema(
  {
    amountCents: { type: Number, required: true, min: 1 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
  },
  { _id: false }
);
const RouteSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    clientId: { type: mongoose.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true },
    pickupCity: String,
    deliveryCity: String,
    descriptionTemplate: String,
    accessorialDefaults: Object,
    active: { type: Boolean, default: true },
    prices: { type: [PriceSchema], default: [] },
  },
  { timestamps: true }
);
RouteSchema.index({ companyId: 1, clientId: 1, name: 1 }, { unique: true });
export default mongoose.model("Route", RouteSchema);
