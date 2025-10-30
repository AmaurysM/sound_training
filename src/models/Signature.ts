// src/models/Signature.ts
import { Role } from "aws-sdk/clients/codedeploy";
import mongoose, { Schema, models, Document } from "mongoose";
import { ISignature } from "./mongoTypes";

const SignatureSchema = new Schema<ISignature>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachedTo: { type: Schema.Types.ObjectId },
    deleted: {type: Boolean, default: false}
  },
  { timestamps: true }
);

export default models.Signature ||
  mongoose.model<ISignature>("Signature", SignatureSchema); 