import UserModule from "./UserModule";
import UserSubmodule from "./UserSubmodule";
// Import in order to ensure proper registration
import TrainingModule from "./TrainingModule";
import User from "./User";
import Signature from "./Signature";
import TrainingSubmodule from "@/models/TrainingSubmodule";
// Re-export everything
export {
  TrainingModule,
  User,
  Signature,
  TrainingSubmodule,
  UserSubmodule,
  UserModule,
};
export * from "./mongoTypes";
