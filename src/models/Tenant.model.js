// backend/models/Tenant.model.js

import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappToken: {
      type: String,
      default: null,
    },
    geminiApiKey: {
      type: String,
      default: null,
    },
    plan: {
      type: String,
      enum: ["1-dollar", "pro", "business"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;