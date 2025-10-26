import mongoose, { Schema, Document, models } from 'mongoose';
import { ITrainingModule } from './TrainingModule';

export interface ITraining extends Document {
  user: mongoose.Types.ObjectId; // user assigned to
  module: mongoose.Types.ObjectId | ITrainingModule; // reference to module template
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TrainingSchema = new Schema<ITraining>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: Schema.Types.ObjectId, ref: 'TrainingModule', required: true },
    ojt: { type: Boolean, default: false },
    practical: { type: Boolean, default: false },
    signedOff: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default models.Training || mongoose.model<ITraining>('Training', TrainingSchema);
