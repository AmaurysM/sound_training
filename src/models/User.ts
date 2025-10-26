import mongoose, { Schema, Document, models } from 'mongoose';
import { ITraining } from './Training';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'Coordinator' | 'Trainer' | 'Trainee';
  name: string;
  archived: boolean;
  trainings?: mongoose.Types.ObjectId[] | ITraining[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Coordinator', 'Trainer', 'Trainee'], required: true },
    name: { type: String, required: true },
    archived: { type: Boolean, default: false },
    trainings: [{ type: Schema.Types.ObjectId, ref: 'Training' }],
  },
  { timestamps: true }
);

export default models.User || mongoose.model<IUser>('User', UserSchema);
