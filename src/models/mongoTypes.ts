// src/models/mongoTypes.ts
import mongoose, { Document } from "mongoose";
import { Role } from "./types";

export interface ITrainingModule extends Document {
  name: string;
  description?: string;
  submodules?: mongoose.Types.ObjectId[] | ITrainingSubModule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrainingSubModule extends Document {
  moduleId: mongoose.Types.ObjectId;
  code: string;
  title: string;
  requiresPractical: boolean;
  ojt: boolean;
  practical: boolean; // was practical completed?
  signedOff: boolean;
  signatures: mongoose.Types.ObjectId[] | ISignature[]; // Can be IDs or populated
  description?: string;
}

export interface ISignature extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  role: Role;
  signedAt: Date;
  trainingId: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITraining extends Document {
  user: mongoose.Types.ObjectId;
  module: mongoose.Types.ObjectId | ITrainingModule;
  // ojt: boolean;
  // practical: boolean;
  // signedOff: boolean;
  // signatures: mongoose.Types.ObjectId[] | ISignature[]; // Can be IDs or populated
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser extends Document {
  username: string;
  password: string;
  role: "Coordinator" | "Trainer" | "Trainee";
  name: string;
  archived: boolean;
  trainings?: mongoose.Types.ObjectId[] | ITraining[];
  createdAt?: Date;
  updatedAt?: Date;
}
