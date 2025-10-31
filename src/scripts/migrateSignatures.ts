// // scripts/migrateSignatures.ts
// import mongoose from "mongoose";
// import Training from "@/models/Training";
// import dotenv from 'dotenv';

// dotenv.config();

// const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sound_training';


// async function migrateSignatures() {
//   try {
//     await mongoose.connect(MONGO_URI);
    
//     await Training.updateMany(
//       { signatures: { $exists: false } },
//       { $set: { signatures: [] } }
//     );
    
//     console.log("Migration completed successfully");
//     process.exit(0);
//   } catch (error) {
//     console.error("Migration failed:", error);
//     process.exit(1);
//   }
// }

// migrateSignatures();