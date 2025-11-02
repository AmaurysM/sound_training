import mongoose, { Schema, models } from "mongoose";
import { IUser } from "./mongoTypes";
import { RoleEnum } from '@/models/types'

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String },

    email: { type: String, unique: true },
    isVerified: { type: Boolean, default: false },
    registrationToken: { type: String },
    tokenExpires: { type: Date },

    role: {
      type: String,
      enum: RoleEnum ,
      required: true,
      default: "Student",
    },

    name: { type: String, required: true },
    nickname: { type: String },
    archived: { type: Boolean, default: false },
    modules: [{ type: Schema.Types.ObjectId, ref: "UserModule" }],
  },
  { timestamps: true }
);

const UserModel = models.User || mongoose.model<IUser>("User", UserSchema);
export default UserModel;
export type { IUser };
