export const RoleEnum = ["Student", "Trainer", "Coordinator"] as const;
export type Role = (typeof RoleEnum)[number];
export const Roles = {
  Student: RoleEnum[0],
  Trainer: RoleEnum[1],
  Coordinator: RoleEnum[2],
} as const;

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
  isVerified: boolean; // please set this to verified
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

export interface ITrainingSubmodule {
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
  tSubmodule: ITrainingSubmodule;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: ISignature[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrainingModule {
  _id?: string;
  name: string;
  description?: string;
  submodules: string[] | ITrainingSubmodule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserModule {
  _id?: string;
  user: string | IUser;
  tModule: string | ITrainingModule;
  submodules: string[] | IUserSubmodule[];
  notes: string;
  archived: boolean;

  trainingYear: number;
  activeCycle: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISignature {
  _id?: string;
  user: string | IUser;
  attachedTo: string;
  archived: boolean;
  role: Role;

  ipAddress?: string;
  userAgent?: string;
  hash?: string;
  
  createdAt?: Date;
  updatedAt?: Date;
}
