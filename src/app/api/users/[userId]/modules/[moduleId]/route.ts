// src/app/api/users/[userId]/modules/[moduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserModule from "@/models/UserModule";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";

// GET single module
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams;

    const mod = await UserModule.findOne({
      _id: moduleId,
      user: userId,
      deleted: { $ne: true }, // ✅ ignore deleted modules
    })
      .populate("tModule")
      .populate({
        path: "submodules",
        match: { deleted: { $ne: true } }, // ✅ exclude deleted submodules too, if any
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { deleted: { $ne: true } }, // ✅ exclude deleted signatures
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
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

    // Only allow updating specific fields
    const allowedUpdates: any = {};
    if (body.notes !== undefined) allowedUpdates.notes = body.notes;
    if (body.submodules !== undefined)
      allowedUpdates.submodules = body.submodules;

    const mod = await UserModule.findOneAndUpdate(
      { _id: moduleId, user: userId, deleted: { $ne: true } },
      allowedUpdates,
      { new: true, runValidators: true }
    )
      .populate("tModule")
      .populate({
        path: "submodules",
        match: { deleted: { $ne: true } }, // ✅ exclude deleted submodules
        populate: [
          { path: "tSubmodule" },
          {
            path: "signatures",
            match: { deleted: { $ne: true } }, // ✅ exclude deleted signatures
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
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

    // 1️⃣ Mark the user module as deleted
    await UserModule.findByIdAndUpdate(moduleId, {
      deleted: true,
    });

    // 2️⃣ Optionally remove from user's modules array
    await User.findByIdAndUpdate(userId, {
      $pull: { modules: moduleId },
    });

    return NextResponse.json({
      success: true,
      message: "Module soft-deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
