import mongoose, { Schema, Document, models } from 'mongoose';

export interface ITrainingModule extends Document {
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TrainingModuleSchema = new Schema<ITrainingModule>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

export default models.TrainingModule || mongoose.model<ITrainingModule>('TrainingModule', TrainingModuleSchema);
