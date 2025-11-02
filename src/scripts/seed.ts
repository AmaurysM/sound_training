import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import UserModel from "@/models/User"; // adjust path if needed
import { Roles } from "@/models/types";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sound_training";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing users
    await UserModel.deleteMany({});
    console.log("Existing users cleared");

    // Seed users with updated schema (trainings as empty array)
    const users = [
      {
        name: "Alice Coordinator",
        username: "alice",
        password: await bcrypt.hash("password123", 10),
        role: "Coordinator",
        trainings: [],
      },
      {
        name: "Tom Trainer",
        username: "tom",
        password: await bcrypt.hash("password123", 10),
        role: "Trainer",
        trainings: [],
      },
      {
        name: "Tina Trainee",
        username: "tina",
        password: await bcrypt.hash("password123", 10),
        role: Roles.Student,
        trainings: [],
      },
    ];

    await UserModel.insertMany(users);
    console.log("Seed data inserted!");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
