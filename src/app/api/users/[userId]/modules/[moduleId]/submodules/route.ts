// src/app/api/users/[userId]/modules/[moduleId]/submodules/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSubmodule from "@/models/UserSubmodule";
import UserModule from "@/models/UserModule";
import { connectToDatabase } from "@/lib/mongodb";

// GET all submodules for a module
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams;

    const submodules = await UserSubmodule.find({
      module: moduleId,
      deleted: { $ne: true }, // ✅ exclude deleted submodules
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { deleted: { $ne: true } }, // ✅ exclude deleted signatures
        populate: { path: "user", select: "_id name role" },
      });

    return NextResponse.json({ success: true, data: submodules });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}

// POST - Create new submodule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams;

    // Verify the module exists and belongs to the user
    const mod = await UserModule.findOne({
      _id: moduleId,
      user: userId,
      deleted: { $ne: true }, // ✅ ensure module isn’t deleted
    });

    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module not found" },
        { status: 404 }
      );
    }

    // Create the submodule
    const submodule = await UserSubmodule.create({
      module: moduleId,
      tSubmodule: body.tSubmodule,
      ojt: body.ojt || false,
      practical: body.practical || false,
      signedOff: body.signedOff || false,
      signatures: body.signatures || [],
    });

    // Add submodule to module's submodules array
    await UserModule.findByIdAndUpdate(moduleId, {
      $push: { submodules: submodule._id },
    });

    // ✅ Populate the new submodule while filtering deleted signatures
    const populated = await UserSubmodule.findById(submodule._id)
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { deleted: { $ne: true } },
        populate: { path: "user", select: "_id name role" },
      });

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}
