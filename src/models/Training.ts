import mongoose, { Schema, models } from 'mongoose';
import { ITraining } from './types';

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
export type { ITraining };