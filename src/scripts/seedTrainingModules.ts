import mongoose from "mongoose";
import TrainingModuleModel from "../models/TrainingModule";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sound_training";

async function seedModules() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await TrainingModuleModel.deleteMany({});
    console.log("Existing training modules cleared");

    const modules = [
      { name: "Basic Apron Safety and Security Program" },
      { name: "Potable Water Servicing Program" },
      { name: "Line Fuel Service 139.321 (e)(2) Program" },
      { name: "Fuel Safety Supervisor 139.321 (e)(1) Program" },
      { name: "Communications and Customer Service Program" },
      { name: "Piston Engine Oil Servicing Program" },
      { name: "Lavatory Service Program" },
      { name: "Intro to SMS Program" },
      { name: "Turbine Engine Oil Servicing Program" },
      { name: "Tug Driver/ Towing Program" },
      { name: "Human Factors Program" },
      { name: "Ground Power Unit Operation Program" },
      { name: "Aircraft Windshield Cleaning Program" },
      { name: "Aircraft Oxygen Servicing Program" },
      { name: "Aircraft De/Anti-icing Program" },
      { name: "Aviation Fuel Quality Control Program" },
    ];

    await TrainingModuleModel.insertMany(modules);
    console.log("Training modules seeded!");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedModules();
