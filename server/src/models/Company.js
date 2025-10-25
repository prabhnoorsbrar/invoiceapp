import mongoose from "mongoose";
const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    timezone: { type: String, default: "America/Los_Angeles" },
  },
  { timestamps: true }
);
export default mongoose.model("Company", CompanySchema);
