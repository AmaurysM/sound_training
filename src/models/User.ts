import mongoose, { Schema, models } from "mongoose";
import { IUser } from "./mongoTypes";

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Coordinator", "Trainer", "Trainee"],
      required: true,
    },
    name: { type: String, required: true },
    archived: { type: Boolean, default: false },
    trainings: [{ type: Schema.Types.ObjectId, ref: "Training" }],
  },
  { timestamps: true }
);

export default models.User || mongoose.model<IUser>("User", UserSchema);
export type { IUser };
