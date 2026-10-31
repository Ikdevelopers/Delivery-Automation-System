// backend/models/Session.model.js

import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      // the JWT itself (or a hashed version of it — see note below)
    },
    userAgent: {
      type: String,
      default: "",
      // lets the user later recognize "Chrome on Windows" vs "Safari on iPhone"
    },
    ipAddress: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
      // TTL index: MongoDB auto-deletes this document once expiresAt passes
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;