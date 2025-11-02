// src/models/UserSubmodule.ts

import mongoose, { Schema, Document, models } from "mongoose";
import { IUserSubmodule } from "./mongoTypes";

const UserSubmoduleSchema = new Schema<IUserSubmodule>(
  {
    module: {type: Schema.Types.ObjectId, ref: "UserModule"},
    tSubmodule: {type: Schema.Types.ObjectId, ref: "TrainingSubmodule"},
    ojt: {type: Boolean},
    practical:{type: Boolean},
    signedOff:{type: Boolean},
    signatures: [{type: Schema.Types.ObjectId, ref: "Signature"}],
  },
  { timestamps: true }
);

export default models.UserSubmodule ||
  mongoose.model<IUserSubmodule>("UserSubmodule", UserSubmoduleSchema);
export type { IUserSubmodule };
