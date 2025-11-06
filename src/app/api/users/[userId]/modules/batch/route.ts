import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import UserModule from "@/models/UserModule";
import UserSubmodule from "@/models/UserSubmodule";
import User from "@/models/User";
import TrainingModule from "@/models/TrainingModule";
import { connectToDatabase } from "@/lib/mongodb";

// Type definitions for request/response
interface BatchModulesRequest {
  modules: string[];
  trainingYear: number;
  activeCycle: number;
}

interface BatchModulesResponse {
  success: boolean;
  created?: PopulatedUserModule[];
  error?: string;
}

// Document type definitions
interface UserModuleDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tModule: Types.ObjectId;
  submodules: Types.ObjectId[];
  notes: string;
  trainingYear: number;
  activeCycle: number;
  archived?: boolean;
}

interface UserSubmoduleDoc {
  _id: Types.ObjectId;
  module: Types.ObjectId;
  tSubmodule: Types.ObjectId;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: Types.ObjectId[];
}

interface TrainingSubmoduleDoc {
  _id: Types.ObjectId;
  [key: string]: any;
}

interface TrainingModuleDoc {
  _id: Types.ObjectId;
  submodules?: TrainingSubmoduleDoc[];
  [key: string]: any;
}

interface PopulatedSignature {
  _id: Types.ObjectId;
  user: {
    _id: Types.ObjectId;
    name: string;
    role: string;
    archived?: boolean;
  };
  archived?: boolean;
  [key: string]: any;
}

interface PopulatedUserSubmodule {
  _id: Types.ObjectId;
  module: Types.ObjectId;
  tSubmodule: TrainingSubmoduleDoc;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: PopulatedSignature[];
}

interface PopulatedUserModule {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tModule: TrainingModuleDoc;
  submodules: PopulatedUserSubmodule[];
  notes: string;
  trainingYear: number;
  activeCycle: number;
  archived?: boolean;
}

// Bulk operation types
interface BulkUpdateOperation {
  updateOne: {
    filter: { _id: Types.ObjectId };
    update: { $set: { submodules: Types.ObjectId[] } };
  };
}

interface SubmoduleMapping {
  startIdx: number;
  count: number;
}

interface UserModuleCreateData {
  user: string;
  tModule: string;
  submodules: never[];
  notes: string;
  trainingYear: number;
  activeCycle: number;
}

interface UserSubmoduleCreateData {
  module: Types.ObjectId;
  tSubmodule: Types.ObjectId;
  ojt: boolean;
  practical: boolean;
  signedOff: boolean;
  signatures: never[];
}

export async function POST(
  req: Request,
  context: { params: Promise<{ userId: string }> }
): Promise<NextResponse<BatchModulesResponse>> {
  const { userId } = await context.params;

  try {
    await connectToDatabase();

    const body: BatchModulesRequest = await req.json();
    const { modules, trainingYear, activeCycle } = body;

    if (!Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json(
        { success: false, error: "No modules provided" },
        { status: 400 }
      );
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Batch check existing modules
      const existingModules = await UserModule.find({
        user: userId,
        tModule: { $in: modules },
        trainingYear,
        activeCycle,
        archived: { $ne: true },
      })
        .session(session)
        .select("tModule")
        .lean<Pick<UserModuleDoc, "_id" | "tModule">[]>();

      const existingModuleIds = new Set<string>(
        existingModules.map((m: Pick<UserModuleDoc, "_id" | "tModule">) => 
          m.tModule.toString()
        )
      );
      
      const modulesToCreate = modules.filter(
        (id: string) => !existingModuleIds.has(id.toString())
      );

      if (modulesToCreate.length === 0) {
        await session.commitTransaction();
        session.endSession();
        return NextResponse.json(
          { success: true, created: [] },
          { status: 201 }
        );
      }

      // 2. Batch load all training modules
      const trainingModules = await TrainingModule.find({
        _id: { $in: modulesToCreate },
      })
        .populate("submodules")
        .session(session)
        .lean<TrainingModuleDoc[]>();

      const trainingModuleMap = new Map<string, TrainingModuleDoc>(
        trainingModules.map((tm: TrainingModuleDoc) => 
          [tm._id.toString(), tm]
        )
      );

      // 3. Batch create all UserModules
      const userModulesToCreate: UserModuleCreateData[] = modulesToCreate
        .map((tModuleId: string) => {
          const tm = trainingModuleMap.get(tModuleId.toString());
          if (!tm) return null;
          return {
            user: userId,
            tModule: tModuleId,
            submodules: [],
            notes: "",
            trainingYear,
            activeCycle,
          };
        })
        .filter((doc): doc is UserModuleCreateData => doc !== null);

      const userModuleDocs = await UserModule.create(userModulesToCreate, {
        session,
        ordered: true,
      }) as unknown as UserModuleDoc[];

      // 4. Batch create all UserSubmodules
      const allSubmodulesToCreate: UserSubmoduleCreateData[] = [];

      const moduleSubmoduleMapping = new Map<string, SubmoduleMapping>();

      userModuleDocs.forEach((userModuleDoc: UserModuleDoc, idx: number) => {
        const tModuleId = modulesToCreate[idx].toString();
        const trainingModule = trainingModuleMap.get(tModuleId);

        if (trainingModule?.submodules) {
          const startIdx = allSubmodulesToCreate.length;
          trainingModule.submodules.forEach((tSub: TrainingSubmoduleDoc) => {
            allSubmodulesToCreate.push({
              module: userModuleDoc._id,
              tSubmodule: tSub._id,
              ojt: false,
              practical: false,
              signedOff: false,
              signatures: [],
            });
          });
          moduleSubmoduleMapping.set(userModuleDoc._id.toString(), {
            startIdx,
            count: trainingModule.submodules.length,
          });
        }
      });

      const createdSubmodules = await UserSubmodule.create(
        allSubmodulesToCreate,
        { session, ordered: true }
      ) as unknown as UserSubmoduleDoc[];

      // 5. Batch update UserModules with submodule references
      const bulkOps: BulkUpdateOperation[] = userModuleDocs
        .map((doc: UserModuleDoc) => {
          const mapping = moduleSubmoduleMapping.get(doc._id.toString());
          if (!mapping) return null;

          const subIds = createdSubmodules
            .slice(mapping.startIdx, mapping.startIdx + mapping.count)
            .map((s: UserSubmoduleDoc) => s._id);

          return {
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { submodules: subIds } },
            },
          };
        })
        .filter((op): op is BulkUpdateOperation => op !== null);

      if (bulkOps.length > 0) {
        await UserModule.bulkWrite(bulkOps, { session });
      }

      // 6. Single update to user's modules array
      await User.findByIdAndUpdate(
        userId,
        { $push: { modules: { $each: userModuleDocs.map((d: UserModuleDoc) => d._id) } } },
        { session }
      );

      // 7. Batch populate all created modules
      const createdModules = await UserModule.find({
        _id: { $in: userModuleDocs.map((d: UserModuleDoc) => d._id) },
      })
        .populate("tModule")
        .populate({
          path: "submodules",
          populate: [
            { path: "tSubmodule" },
            {
              path: "signatures",
              match: { archived: { $ne: true } },
              populate: { path: "user", select: "_id name role archived" },
            },
          ],
        })
        .session(session)
        .lean<PopulatedUserModule[]>();

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json(
        { success: true, created: createdModules },
        { status: 201 }
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Batch POST error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}