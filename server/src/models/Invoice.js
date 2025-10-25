import mongoose from "mongoose";
const InvoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    clientId: { type: mongoose.Types.ObjectId, ref: "Client", required: true },
    routeId: { type: mongoose.Types.ObjectId, ref: "Route" },
    invoiceNumber: { type: String, required: true },
    loadRef: String,
    description: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 1 },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "outstanding", "paid"],
      default: "outstanding",
    },
    paidDate: { type: Date },
    paymentMethod: String,
    paymentRef: String,
    createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
InvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ companyId: 1, invoiceDate: 1 });
InvoiceSchema.index({ companyId: 1, paidDate: 1 });
export default mongoose.model("Invoice", InvoiceSchema);
