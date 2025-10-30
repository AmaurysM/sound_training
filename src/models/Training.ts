// src/models/Training.ts
import mongoose, { Schema, models } from "mongoose";
import { ITraining } from "./mongoTypes";

const TrainingSchema = new Schema<ITraining>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    module: {
      type: Schema.Types.ObjectId,
      ref: "TrainingModule",
      required: true,
    },
    // ojt: { type: Boolean, default: false },
    // practical: { type: Boolean, default: false },
    // signedOff: { type: Boolean, default: false },
    // signatures: [{ type: Schema.Types.ObjectId, ref: "Signature" }], // Array of IDs
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.Training ||
  mongoose.model<ITraining>("Training", TrainingSchema);
export type { ITraining };