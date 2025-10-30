// scripts/migrateSubmodules.ts
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/mongodb";
import TrainingSubmodule from "../models/TrainingSubModule";
import dotenv from "dotenv";

dotenv.config();

async function migrateSubmodules() {
  try {
    await connectToDatabase();
    console.log("Connected to database.");

    const submodules = await TrainingSubmodule.find({});
    console.log(`Found ${submodules.length} submodules. Migrating...`);

    const updates = submodules.map(async (sub) => {
      let modified = false;

      if (sub.ojt === undefined) {
        sub.ojt = false;
        modified = true;
      }
      if (sub.practical === undefined) {
        sub.practical = false;
        modified = true;
      }
      if (sub.signedOff === undefined) {
        sub.signedOff = false;
        modified = true;
      }
      if (!Array.isArray(sub.signatures)) {
        sub.signatures = [];
        modified = true;
      }
      if (sub.description === undefined) {
        sub.description = "";
        modified = true;
      }

      if (modified) {
        await sub.save();
        console.log(`Updated submodule ${sub._id}`);
      } else {
        console.log(`No changes needed for submodule ${sub._id}`);
      }
    });

    await Promise.allSettled(updates);

    console.log("Migration completed!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrateSubmodules();
