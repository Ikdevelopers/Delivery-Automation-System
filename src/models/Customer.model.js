// backend/models/Customer.model.js

import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    savedAddresses: {
      type: [
        {
          label: { type: String, trim: true },
          address: { type: String, trim: true },
          coordinates: {
            lat: Number,
            lng: Number,
          },
        },
      ],
      default: [],
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    lastOrderAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;