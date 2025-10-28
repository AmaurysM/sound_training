// src/models/Signature.ts
import { Role } from "aws-sdk/clients/codedeploy";
import mongoose, { Schema, models, Document } from "mongoose";

export interface ISignature extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  role: Role;
  signedAt: Date;
  trainingId: mongoose.Types.ObjectId; 
  createdAt?: Date;
  updatedAt?: Date;
}

const SignatureSchema = new Schema<ISignature>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    role: {
      type: String,
      enum: ["Trainer", "Coordinator", "Trainee"],
      required: true,
    },
    signedAt: { type: Date, default: Date.now, required: true },
    trainingId: { type: Schema.Types.ObjectId, ref: "Training", required: true },
  },
  { timestamps: true }
);

export default models.Signature ||
  mongoose.model<ISignature>("Signature", SignatureSchema);