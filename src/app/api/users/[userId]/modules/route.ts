// src/app/api/users/[userId]/modules/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserModule from "@/models/UserModule";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ITrainingSubModule, TrainingModule, UserSubmodule } from "@/models";

// GET all modules for a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { userId } = resolvedParams;

    // Only fetch modules that are not soft-deleted
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
          },
        ],
      });

    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}

// POST - Create new module for user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await connectToDatabase(); // assuming this returns mongoose connection
  const dbSession = await session.startSession();

  try {
    dbSession.startTransaction();

    const body = await req.json();
    const { tModule, notes } = body;

    const resolvedParams = await params;
    const { userId } = resolvedParams;

    // 1️⃣ Find the training module and its submodules
    const trainingModule = await TrainingModule.findById(tModule)
      .populate("submodules")
      .session(dbSession);
    if (!trainingModule) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { success: false, error: "Training module not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Create the user module (empty submodules for now)
    const userModule = await UserModule.create(
      [
        {
          user: userId,
          tModule,
          submodules: [],
          notes: notes || "",
        },
      ],
      { session: dbSession }
    );

    const userModuleDoc = userModule[0];

    // 3️⃣ For each training submodule, create a matching user submodule
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

    // 4️⃣ Attach all user submodules to the user module
    userModuleDoc.submodules = createdUserSubmodules;
    await userModuleDoc.save({ session: dbSession });

    // 5️⃣ Add user module to user's list of modules
    await User.findByIdAndUpdate(
      userId,
      { $push: { modules: userModuleDoc._id } },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
    dbSession.endSession();

    // 6️⃣ Populate result for response
    const populated = await UserModule.findById(userModuleDoc._id)
      .populate("tModule")
      .populate({
        path: "submodules",
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { deleted: { $ne: true } }, // ✅ also exclude soft-deleted here
          },
        ],
      });

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("Error creating user module:", error);
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}
