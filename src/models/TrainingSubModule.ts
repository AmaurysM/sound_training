// src/models/TrainingSubmodule.ts

import mongoose, { Schema, Document } from "mongoose";
import { ITrainingSubmodule } from "./mongoTypes";
import "./Signature";

const TrainingSubmoduleSchema = new Schema<ITrainingSubmodule>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: "TrainingModule",
      required: true,
    },
    code: { type: String, required: true },
    title: { type: String, required: true },
    requiresPractical: { type: Boolean, default: false },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingSubmodule ||
  mongoose.model<ITrainingSubmodule>(
    "TrainingSubmodule",
    TrainingSubmoduleSchema
  );
