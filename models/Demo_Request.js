// models/Demo_Request.js

import mongoose from "mongoose";

const demoRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    service: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },
    status: {
      type: String,
      enum: ["not_viewed", "viewed"],
      default: "not_viewed",
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

export default mongoose.model("Demo_Request", demoRequestSchema);