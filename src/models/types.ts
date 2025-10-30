// import { ITrainingSubmodule } from "./TrainingSubModule";

export type Role = "Trainee" | "Trainer" | "Coordinator";

export interface Stat {
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
  percentage: number;
}

export interface IUser {
  _id?: string;
  username: string;
  password: string;
  role: Role;
  name: string;
  archived: boolean;
  trainings?: ITraining[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrainingSubModule {
  _id?: string;
  moduleId: string;
  code: string;
  title: string;
  requiresPractical: boolean;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: ISignature[];
  description?: string;
  createdAt?: Date; 
  updatedAt?: Date; 
}

export interface ITrainingModule {
  _id?: string;
  name: string;
  description?: string;
  submodules: ITrainingSubModule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISignature {
  _id?: string;
  userId: string;
  userName: string;
  role: Role;
  signedAt: Date;
}

export interface ITraining {
  _id?: string;
  user: string; // Id of user or the user object.
  module: string | ITrainingModule; // Id of module or ItrainingModule object.
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}
