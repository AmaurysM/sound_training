import mongoose from "mongoose";
import dotenv from "dotenv";
import UserSubmodule from "@/models/UserSubmodule";
import { IUserSubmodule, ITrainingSubmodule, ISignature } from "@/models";
import "@/models/TrainingSubmodule";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sound_training";

async function seedSignOff() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Fetch all user submodules that are not yet signed off
    const userSubmodules: IUserSubmodule[] = await UserSubmodule.find({ signedOff: false })
      .populate("tSubmodule")
      .populate("signatures");

    let updatedCount = 0;

    for (const sub of userSubmodules) {
      const tSub = sub.tSubmodule as ITrainingSubmodule;
      const sigs = sub.signatures as ISignature[];

      const activeSigs = sigs.filter(sig => !sig.archived).length;
      const ojtDone = sub.ojt;
      const practicalDone = !tSub.requiresPractical || sub.practical;

      if (activeSigs >= 3 && ojtDone && practicalDone) {
        sub.signedOff = true;
        await sub.save();
        updatedCount++;
        console.log(`Signed off submodule ${tSub.title} for user ${sub.module}`);
      }
    }

    console.log(`Done! Total submodules signed off: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error("Error signing off submodules:", err);
    process.exit(1);
  }
}

seedSignOff();