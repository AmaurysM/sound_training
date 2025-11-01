// src/models/TrainingFiles.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ITrainingFile extends Document {
  trainingId: string;
  fileName: string;
  fileType: string;
  url: string;
  uploadedBy: string; // User's name who uploaded
  uploadedById: string; // User's ID who uploaded
  createdAt: Date;
}

const TrainingFileSchema = new Schema<ITrainingFile>({
  trainingId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadedById: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.TrainingFile || mongoose.model<ITrainingFile>("TrainingFile", TrainingFileSchema);