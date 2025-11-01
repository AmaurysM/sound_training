import { Signature } from "@/models";
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

export interface IUserModule extends Document {
  user: mongoose.Types.ObjectId | IUser;
  tModule: mongoose.Types.ObjectId | ITrainingModule;
  submodules: mongoose.Types.ObjectId[] | IUserSubmodule[];
  notes: string;
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrainingSubModule extends Document {
  moduleId: mongoose.Types.ObjectId;
  code: string;
  title: string;
  requiresPractical: boolean;
  description?: string;
}

export interface IUserSubmodule extends Document {
  module: mongoose.Types.ObjectId | IUserModule;
  tSubmodule: mongoose.Types.ObjectId | ITrainingSubModule;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: mongoose.Types.ObjectId[] | ISignature[];
}

export interface ISignature extends Document {
  user: mongoose.Types.ObjectId | IUser;
  attachedTo: mongoose.Types.ObjectId;
  role: Role;
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser extends Document {
  username: string;
  password?: string;

  email?: string;
  isVerified: boolean;
  registrationToken?: string;
  tokenExpires?: Date;

  role: Role;
  name: string;
  nickname: string;
  archived: boolean;
  modules?: mongoose.Types.ObjectId[] | IUserModule[];
  createdAt?: Date;
  updatedAt?: Date;
}
