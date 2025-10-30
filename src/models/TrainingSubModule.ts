// src/models/TrainingSubModules.ts

import mongoose, { Schema, Document } from "mongoose";
import { ITrainingSubModule } from "./mongoTypes";
import "./Signature";

const TrainingSubModuleSchema = new Schema<ITrainingSubModule>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: "TrainingModule",
      required: true,
    },
    code: { type: String, required: true },
    title: { type: String, required: true },
    requiresPractical: { type: Boolean, default: false },
    ojt: { type: Boolean, default: false },
    practical: { type: Boolean, default: false },
    signedOff: { type: Boolean, default: false },
    signatures: [{ type: Schema.Types.ObjectId, ref: "Signature" }], // Array of IDs
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingSubModule ||
  mongoose.model<ITrainingSubModule>(
    "TrainingSubModule",
    TrainingSubModuleSchema
  );
