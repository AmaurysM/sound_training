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

export interface ITrainingModule {
  _id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// NEW: Signature interface
export interface ISignature {
  _id?: string;
  userId: string;
  userName: string;
  role: Role;
  signedAt: Date;
}

export interface ITraining {
  _id?: string;
  user: string;
  module: string | ITrainingModule;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: ISignature[]; // NEW: Array of signatures
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}
