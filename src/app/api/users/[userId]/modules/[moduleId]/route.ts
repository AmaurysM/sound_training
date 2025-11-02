// src/app/api/users/[userId]/modules/[moduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserModule from "@/models/UserModule";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

// GET single module
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  try {
    await connectToDatabase();

    // Add timeout protection
    const resolvedParams = (await Promise.race([
      params,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Params timeout")), 5000)
      ),
    ])) as { userId: string; moduleId: string };

    const { userId, moduleId } = resolvedParams;

    // Validate params exist
    if (!userId || !moduleId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(moduleId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const mod = await UserModule.findOne({
      _id: moduleId,
      user: userId,
      archived: { $ne: true }, // ✅ ignore archived modules
    })
      .populate("tModule")
      .populate({
        path: "submodules",
        match: { archived: { $ne: true } }, // ✅ exclude archived submodules too, if any
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { archived: { $ne: true } }, // ✅ exclude archived signatures
            populate: { path: "user", select: "_id name role archived" },
          },
        ],
      });

    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: mod });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

// PATCH - Update module
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(moduleId)
    ) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // ✅ Allow updating specific fields including activeCycle and trainingYear
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowedUpdates: any = {};
    if (body.notes !== undefined) allowedUpdates.notes = body.notes;
    if (body.submodules !== undefined)
      allowedUpdates.submodules = body.submodules;
    if (body.activeCycle !== undefined)
      allowedUpdates.activeCycle = body.activeCycle;
    if (body.trainingYear !== undefined)
      allowedUpdates.trainingYear = body.trainingYear;

    const mod = await UserModule.findOneAndUpdate(
      { _id: moduleId, user: userId, archived: { $ne: true } },
      allowedUpdates,
      { new: true, runValidators: true }
    )
      .populate("tModule")
      .populate({
        path: "submodules",
        match: { archived: { $ne: true } }, // ✅ exclude archived submodules
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { archived: { $ne: true } }, // ✅ exclude archived signatures
            populate: { path: "user", select: "_id name role archived" },
          },
        ],
      });

    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: mod });
  } catch (error) {
    console.error("PATCH /modules/[moduleId] error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

// DELETE - Soft Delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(moduleId)
    ) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // 1️⃣ Mark the user module as archived
    await UserModule.findByIdAndUpdate(moduleId, {
      archived: true,
    });

    // 2️⃣ Optionally remove from user's modules array
    await User.findByIdAndUpdate(userId, {
      $pull: { modules: moduleId },
    });

    return NextResponse.json({
      success: true,
      message: "Module archived successfully",
    });
  } catch (error) {
    console.error("DELETE /modules/[moduleId] error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
