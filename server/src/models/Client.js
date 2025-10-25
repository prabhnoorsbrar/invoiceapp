import mongoose from "mongoose";
const ClientSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true },
    emailTo: [{ type: String }],
    address: String,
    paymentTermsDays: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
ClientSchema.index({ companyId: 1, name: 1 }, { unique: true });
export default mongoose.model("Client", ClientSchema);
