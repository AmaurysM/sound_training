// src/app/api/users/[userId]/modules/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserModule from "@/models/UserModule";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ITrainingSubmodule, TrainingModule, UserSubmodule } from "@/models";

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

    // ✅ Fetch all active (archived) user modules
    const modules = await UserModule.find({
      user: userId,
      archived: { $ne: true },
    })
      .populate("tModule")
      .populate({
        path: "submodules",
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { archived: { $ne: true } }, // ✅ exclude archived signatures
            populate: { path: "user", select: "_id name role archived" },
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
  const mongoose = await connectToDatabase();

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
  if (!tModule) {
    return NextResponse.json(
      { success: false, error: "Missing required field: tModule." },
      { status: 400 }
    );
  }

  const currentYear = new Date().getFullYear();
  const moduleTrainingYear = trainingYear ?? currentYear;
  const moduleActiveCycle = activeCycle ?? true;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ✅ Ensure not duplicated
      const existingModule = await UserModule.findOne({
        user: userId,
        tModule,
        trainingYear: moduleTrainingYear,
        activeCycle: moduleActiveCycle,
        archived: { $ne: true },
      }).session(session);

      if (existingModule) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          {
            success: false,
            error: "This module is already assigned for this training cycle.",
          },
          { status: 409 }
        );
      }

      // ✅ Load the training module and its submodules
      const trainingModule = await TrainingModule.findById(tModule)
        .populate("submodules")
        .session(session);

      if (!trainingModule) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { success: false, error: "Training module not found." },
          { status: 404 }
        );
      }

      // ✅ Create user module
      const [userModuleDoc] = await UserModule.create(
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
        { session }
      );

      // ✅ Create user submodules
      const createdUserSubmodules = await Promise.all(
        trainingModule.submodules.map(async (tSub: ITrainingSubmodule) => {
          const [newUserSub] = await UserSubmodule.create(
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
            { session }
          );
          return newUserSub._id;
        })
      );

      // ✅ Attach submodules and save
      userModuleDoc.submodules = createdUserSubmodules;
      await userModuleDoc.save({ session });

      // ✅ Add module to user's record
      await User.findByIdAndUpdate(
        userId,
        { $push: { modules: userModuleDoc._id } },
        { session }
      );

      // ✅ Commit
      await session.commitTransaction();
      session.endSession();

      // ✅ Populate and return
      const populated = await UserModule.findById(userModuleDoc._id)
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
        });

      return NextResponse.json(
        { success: true, data: populated },
        { status: 201 }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (
        ["WriteConflict", "TransientTransactionError"].includes(
          error.codeName
        ) &&
        attempt < maxRetries - 1
      ) {
        console.warn(
          `Retrying transaction due to ${error.codeName} (attempt ${
            attempt + 1
          })`
        );
        attempt++;
        await new Promise((res) => setTimeout(res, 200 * (attempt + 1))); // small delay
        continue;
      }

      await session.abortTransaction();
      session.endSession();
      console.error("POST /modules error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
  }
}
