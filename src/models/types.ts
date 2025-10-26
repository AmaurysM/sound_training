import mongoose, { Document } from 'mongoose';

export interface ITrainingModule extends Document {
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITraining extends Document {
  user: mongoose.Types.ObjectId;
  module: mongoose.Types.ObjectId | ITrainingModule;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

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