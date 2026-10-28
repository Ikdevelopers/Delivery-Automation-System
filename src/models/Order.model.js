// backend/models/Order.model.js

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    subOrders: {
      type: [
        {
          vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
          },
          items: [
            {
              menuItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MenuItem",
                required: true,
              },
              quantity: {
                type: Number,
                required: true,
                min: 1,
              },
              priceAtOrderTime: {
                type: Number,
                required: true,
                min: 0,
                // Snapshot of the menu price, unaffected by later price changes.
              },
            },
          ],
          status: {
            type: String,
            enum: ["pending", "preparing", "ready", "cancelled"],
            default: "pending",
          },
          readyAt: {
            type: Date,
            default: null,
          },
        },
      ],
      default: [],
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "ready_for_billing",
        "completed",
        "cancelled",
      ],
      default: "pending",
      // Service logic updates this when all sub-orders are ready.
    },
    billedAmount: {
      type: Number,
      default: null,
      // Set once at handoff to the customer.
    },
    billedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      // The waiter, rider, or collector who finalized the bill.
    },
    billedAt: {
      type: Date,
      default: null,
    },
    deliveryAddress: {
      type: String,
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;