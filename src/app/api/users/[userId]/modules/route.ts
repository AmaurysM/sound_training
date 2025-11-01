// src/app/api/users/[userId]/modules/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserModule from "@/models/UserModule";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ITrainingSubModule, TrainingModule, UserSubmodule } from "@/models";

// ✅ GET all modules for a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId?: string }> }
) {
  try {
    await connectToDatabase();

    // ✅ Safely unwrap and validate params
    const resolvedParams = await params;
    const { userId } = resolvedParams || {};
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId in request parameters." },
        { status: 400 }
      );
    }

    // ✅ Fetch all active (non-deleted) user modules
    const modules = await UserModule.find({
      user: userId,
      deleted: { $ne: true },
    })
      .populate("tModule")
      .populate({
        path: "submodules",
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { deleted: { $ne: true } }, // ✅ exclude soft-deleted signatures
            populate: { path: "user", select: "_id name role" },
          },
        ],
      })
      .sort({ trainingYear: -1, createdAt: -1 }); // ✅ Sort by year and date

    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    console.error("GET /modules error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

// ✅ POST - Create new user module from training module
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId?: string }> }
) {
  const session = await connectToDatabase();
  const dbSession = await session.startSession();

  try {
    dbSession.startTransaction();

    const resolvedParams = await params;
    const { userId } = resolvedParams || {};
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId in request parameters." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { tModule, notes, trainingYear, activeCycle } = body || {};

    // ✅ Validate body input
    if (!tModule) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { success: false, error: "Missing required field: tModule." },
        { status: 400 }
      );
    }

    // ✅ Set defaults for training cycle fields
    const currentYear = new Date().getFullYear();
    const moduleTrainingYear = trainingYear ?? currentYear;
    const moduleActiveCycle = activeCycle ?? true;

    // ✅ Check for duplicate module in same training cycle
    const existingModule = await UserModule.findOne({
      user: userId,
      tModule,
      trainingYear: moduleTrainingYear,
      activeCycle: moduleActiveCycle,
      deleted: { $ne: true },
    }).session(dbSession);

    if (existingModule) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { 
          success: false, 
          error: "This module is already assigned for this training cycle." 
        },
        { status: 409 }
      );
    }

    // ✅ Find training module and its submodules
    const trainingModule = await TrainingModule.findById(tModule)
      .populate("submodules")
      .session(dbSession);

    if (!trainingModule) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { success: false, error: "Training module not found." },
        { status: 404 }
      );
    }

    // ✅ Create user module with training cycle fields
    const userModule = await UserModule.create(
      [
        {
          user: userId,
          tModule,
          submodules: [],
          notes: notes || "",
          trainingYear: moduleTrainingYear,
          activeCycle: moduleActiveCycle,
        },
      ],
      { session: dbSession }
    );

    const userModuleDoc = userModule[0];

    // ✅ Create corresponding user submodules
    const createdUserSubmodules = await Promise.all(
      trainingModule.submodules.map(async (tSub: ITrainingSubModule) => {
        const newUserSub = await UserSubmodule.create(
          [
            {
              module: userModuleDoc._id,
              tSubmodule: tSub._id,
              ojt: false,
              practical: false,
              signedOff: false,
              signatures: [],
            },
          ],
          { session: dbSession }
        );
        return newUserSub[0]._id;
      })
    );

    // ✅ Attach user submodules to the user module
    userModuleDoc.submodules = createdUserSubmodules;
    await userModuleDoc.save({ session: dbSession });

    // ✅ Add module to the user's record
    await User.findByIdAndUpdate(
      userId,
      { $push: { modules: userModuleDoc._id } },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    dbSession.endSession();

    // ✅ Populate the final response (exclude deleted)
    const populated = await UserModule.findById(userModuleDoc._id)
      .populate("tModule")
      .populate({
        path: "submodules",
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { deleted: { $ne: true } },
            populate: { path: "user", select: "_id name role" },
          },
        ],
      });

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("POST /modules error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}