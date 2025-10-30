// src/models/UserModule.ts
import mongoose, { Schema, Document, models } from "mongoose";
import { IUserModule } from "./mongoTypes";

const UserModuleSchema = new Schema<IUserModule>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    tModule: {type: Schema.Types.ObjectId, ref: "TrainingModule"},
    submodules: [{ type: Schema.Types.ObjectId, ref: "UserSubmodule" }],
    notes: {type: String},
    deleted: {type: Boolean, default: false}    
  },
  { timestamps: true }
);

export default models.UserModule ||
  mongoose.model<IUserModule>("UserModule", UserModuleSchema);
export type { IUserModule };
