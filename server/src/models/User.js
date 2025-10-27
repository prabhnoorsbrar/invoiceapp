import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "finance", "viewer"],
      default: "admin",
    },
    companyId: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

UserSchema.methods.verifyPassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

UserSchema.statics.hash = (pw) => bcrypt.hash(pw, 10);

export default mongoose.model("User", UserSchema);