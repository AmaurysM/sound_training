// scripts/seedSignatures.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import Signature from "@/models/Signature"; // adjust path if needed
import { connectToDatabase } from "@/lib/mongodb";
import { Roles } from "@/models/types";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sound_training";

async function seedSignatures() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await Signature.updateMany(
      { role: { $exists: false } },
      { $set: { role: Roles.Student } }
    );

    console.log(`Updated ${result.modifiedCount} signatures`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedSignatures();
