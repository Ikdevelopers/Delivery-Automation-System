// backend/models/MenuItem.model.js

import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    variants: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // reserved for future: [{ label: "Large", priceDelta: 100 }]
    },
    addOns: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // reserved for future: [{ name: "Extra Cheese", price: 50 }]
    },
  },
  { timestamps: true }
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;