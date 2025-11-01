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
  password?: string;

  email?: string;
  isVerified: boolean;
  registrationToken?: string;
  tokenExpires?: Date;

  role: Role;
  name: string;
  nickname: string;
  archived: boolean;
  modules: string[] | IUserModule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrainingSubModule {
  _id?: string;
  moduleId: string;
  code: string;
  title: string;
  requiresPractical: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserSubmodule extends Document {
  _id?: string;
  module: string | IUserModule;
  tSubmodule: ITrainingSubModule;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: ISignature[];
}

export interface ITrainingModule {
  _id?: string;
  name: string;
  description?: string;
  submodules: string[] | ITrainingSubModule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserModule {
  _id?: string;
  user: string | IUser;
  tModule: string | ITrainingModule;
  submodules: string[] | IUserSubmodule[];
  notes: string;
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISignature {
  _id?: string;
  user: string | IUser;
  attachedTo: string;
  deleted: boolean;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

// export interface ITraining {
//   _id?: string;
//   user: string; // Id of user or the user object.
//   module: string | ITrainingModule; // Id of module or ItrainingModule object.
//   notes: string;
//   createdAt?: Date;
//   updatedAt?: Date;
// }
