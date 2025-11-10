// src/models/Signature.ts
import mongoose, { Schema, models, Document } from "mongoose";
import { ISignature } from "./mongoTypes";
import { RoleEnum } from "./types";

const SignatureSchema = new Schema<ISignature>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachedTo: { type: Schema.Types.ObjectId },
    archived: { type: Boolean, default: false },
    ipAddress: { type: String },
    userAgent: { type: String },
    role: {
      type: String,
      enum: RoleEnum,
    },
  },
  { timestamps: true }
);

export default models.Signature ||
  mongoose.model<ISignature>("Signature", SignatureSchema);
