// src/models/TrainingModules.ts
import mongoose, { Schema, Document, models } from "mongoose";
import { ITrainingModule } from "./mongoTypes";

const TrainingModuleSchema = new Schema<ITrainingModule>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    submodules: [{ type: Schema.Types.ObjectId, ref: "TrainingSubmodule" }],
  },
  { timestamps: true }
);

export default models.TrainingModule ||
  mongoose.model<ITrainingModule>("TrainingModule", TrainingModuleSchema);
export type { ITrainingModule };
