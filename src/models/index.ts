import UserModule from './UserModule';
import UserSubmodule from './UserSubmodule';
// Import in order to ensure proper registration
import TrainingModule from "./TrainingModule";
import User from "./User";
import Signature from "./Signature";
import TrainingSubModule from "./TrainingSubModule";
// Re-export everything
export { TrainingModule, User, Signature, TrainingSubModule, UserSubmodule, UserModule };
export * from "./mongoTypes";
