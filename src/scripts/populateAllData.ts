import mongoose from "mongoose";
import dotenv from "dotenv";
import TrainingModuleModel from "../models/TrainingModule";
import TrainingSubModuleModel from "@/models/TrainingSubModule";
import UserModel from "../models/User";
import TrainingModel from "../models/Training";
import SignatureModel from "../models/Signature";
import bcrypt from "bcrypt";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sound_training";

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Wipe everything clean
    await Promise.all([
      TrainingModuleModel.deleteMany({}),
      TrainingSubModuleModel.deleteMany({}),
      UserModel.deleteMany({}),
      TrainingModel.deleteMany({}),
      SignatureModel.deleteMany({}),
    ]);
    console.log("🧹 All collections cleared!");

    // Define your modules and submodules
    const rawData: [string, string, string, boolean][] = [
      [
        "Basic Apron Safety and Security Program",
        "B001",
        "Intro to General and Business Aviation",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B002",
        "The Language of Aviation",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B003",
        "Aircraft Terminology",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B004",
        "Introduction to Ground Handling Operations",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B005",
        "Role of a Line Service Specialist",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "S001",
        "Role of a Customer Service Representative",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B006",
        "Basic Apron and Apron Safety",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B007a",
        "Airport Security Awareness",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "B007b",
        "Specific Airport Security",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "L001",
        "Aircraft Marshalling",
        true,
      ],
      ["Basic Apron Safety and Security Program", "L002", "Wing Walking", true],
      [
        "Basic Apron Safety and Security Program",
        "L003",
        "Apron Operations Management",
        false,
      ],
      [
        "Basic Apron Safety and Security Program",
        "L007",
        "Driving on the Airport",
        true,
      ],
      [
        "Communications and Customer Service Program",
        "S002",
        "Effective Communication",
        false,
      ],
      [
        "Communications and Customer Service Program",
        "S003",
        "Radio Communication Procedures",
        true,
      ],
      [
        "Communications and Customer Service Program",
        "S004",
        "Conflict Resolution",
        false,
      ],
      [
        "Ground Power Unit Operation Program",
        "L008",
        "Ground Power Units",
        true,
      ],
      [
        "Introduction to Safety Management Systems",
        "SMS001",
        "Introduction to Safety Management Systems",
        false,
      ],
      ["Lavatory Service Program", "L004", "Lavatory Service", true],
      [
        "Piston Engine Oil Servicing Program",
        "F001",
        "Piston Engine Oil Servicing",
        true,
      ],
      [
        "Potable Water Servicing Program",
        "L005",
        "Potable Water Servicing",
        true,
      ],
      ["Tug Driver/Towing Program", "T001", "Aircraft Towing Basics", true],
      ["Tug Driver/Towing Program", "T002", "Tug and Towbar Towing", true],
      [
        "Turbine Engine Oil Servicing Program",
        "F002",
        "Turbine Engine Oil Servicing",
        true,
      ],
      [
        "Fuel Safety Supervisor and Line Fuel Service Programs",
        "F003",
        "Aviation Fuel Basics",
        false,
      ],
      [
        "Fuel Safety Supervisor and Line Fuel Service Programs",
        "F004",
        "Mobile Refueler Familiarization",
        false,
      ],
      [
        "Fuel Safety Supervisor and Line Fuel Service Programs",
        "F005",
        "Misfueling Prevention",
        false,
      ],
      [
        "Fuel Safety Supervisor and Line Fuel Service Programs",
        "F006",
        "Over-Wing Refueling",
        true,
      ],
      [
        "Fuel Safety Supervisor and Line Fuel Service Programs",
        "F007",
        "Single-Point Refueling",
        true,
      ],
      [
        "Fuel Safety Supervisor and Line Fuel Service Programs",
        "F008",
        "DEF Contamination Prevention",
        false,
      ],
      [
        "Aircraft Windshield Cleaning Program",
        "L006",
        "Aircraft Windshield Cleaning",
        true,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q001",
        "Quality Control in Aviation Fuels",
        false,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q002",
        "QC Record Keeping and Documentation",
        false,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q003",
        "The White Bucket Test",
        true,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q004",
        "The API Gravity Test",
        true,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q005",
        "The Free Water Test",
        true,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q006",
        "The Filter Membrane Test",
        true,
      ],
      [
        "Aviation Fuel Quality Control Program",
        "Q007",
        "The Receipt of Fuel",
        true,
      ],
    ];

    // Group submodules by their module
    const moduleMap = new Map<string, [string, string, string, boolean][]>();
    for (const [moduleName, code, title, requiresPractical] of rawData) {
      if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, []);
      moduleMap
        .get(moduleName)!
        .push([moduleName, code, title, requiresPractical]);
    }

    // Insert all modules
    const moduleDocs = new Map<string, mongoose.Document>();
    for (const moduleName of moduleMap.keys()) {
      const moduleDoc = await TrainingModuleModel.create({ name: moduleName });
      moduleDocs.set(moduleName, moduleDoc);
    }

    // Insert submodules
    for (const [moduleName, entries] of moduleMap.entries()) {
      const moduleDoc = moduleDocs.get(moduleName)!;
      const submodules = await TrainingSubModuleModel.insertMany(
        entries.map(([_, code, title, requiresPractical]) => ({
          moduleId: moduleDoc._id,
          code,
          title,
          requiresPractical,
        }))
      );

      // Update module’s submodule array
      moduleDoc.set({ submodules: submodules.map((s) => s._id) });
      await moduleDoc.save();
      console.log(`✅ ${moduleName}: ${submodules.length} submodules added`);
    }

    // Seed users
    const users = await UserModel.insertMany([
      {
        name: "Alice Coordinator",
        username: "alice",
        password: await bcrypt.hash("password123", 10),
        role: "Coordinator",
        trainings: [],
        signatures: [],
      },
      {
        name: "Tom Trainer",
        username: "tom",
        password: await bcrypt.hash("password123", 10),
        role: "Trainer",
        trainings: [],
        signatures: [],
      },
      {
        name: "Tina Trainee",
        username: "tina",
        password: await bcrypt.hash("password123", 10),
        role: "Trainee",
        trainings: [],
        signatures: [],
      },
    ]);
    console.log("👥 Users seeded");

    // Seed sample training
    const exampleModule = Array.from(moduleDocs.values())[0];
    await TrainingModel.create({
      user: users[2]._id,
      module: exampleModule._id,
      ojt: true,
      practical: true,
      signedOff: false,
      signatures: [],
      notes: "Initial training",
    });
    console.log("📘 Example training created");

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding database:", err);
    process.exit(1);
  }
}

seedDatabase();
