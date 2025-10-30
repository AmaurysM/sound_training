// src/app/api/users/[userId]/modules/[moduleId]/submodules/[submoduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSubmodule from "@/models/UserSubmodule";
import UserModule from "@/models/UserModule";
import Signature from "@/models/Signature";

import { connectToDatabase } from "@/lib/mongodb";

// GET single submodule
// GET single submodule
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ userId: string; moduleId: string; submoduleId: string }>;
  }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { moduleId, submoduleId } = resolvedParams;

    const submodule = await UserSubmodule.findOne({
      _id: submoduleId,
      module: moduleId,
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        populate: { path: "user", select: "_id name role" }, // <-- populate user
      });

    if (!submodule) {
      return NextResponse.json({ success: false, error: "Submodule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: submodule });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


// PATCH - Update submodule
// PATCH - Update submodule
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ userId: string; moduleId: string; submoduleId: string }>;
  }
) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const resolvedParams = await params;
    const { moduleId, submoduleId } = resolvedParams;

    // Find the submodule first
    const submodule = await UserSubmodule.findOne({ _id: submoduleId, module: moduleId });

    if (!submodule) {
      return NextResponse.json({ success: false, error: "Submodule not found" }, { status: 404 });
    }

    // Update allowed fields
    if (body.ojt !== undefined) submodule.ojt = body.ojt;
    if (body.practical !== undefined) submodule.practical = body.practical;
    if (body.signedOff !== undefined) submodule.signedOff = body.signedOff;

    // Add new signature if requested
    if (body.addSignature?.userId) {
      const newSignature = await Signature.create({
        user: body.addSignature.userId,
        attachedTo: submodule._id,
      });
      submodule.signatures.push(newSignature._id);
    }

    await submodule.save();

    // Populate tSubmodule and signatures with user info
    const populatedSubmodule = await UserSubmodule.findById(submodule._id)
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        populate: { path: "user", select: "_id name role" }, // <-- this is key
      });

    return NextResponse.json({ success: true, data: populatedSubmodule });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


// DELETE - Remove submodule reference from module (soft delete)
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ userId: string; moduleId: string; submoduleId: string }>;
  }
) {
  try {
    await connectToDatabase();

    const resolvedParams = await params;
    const { userId, moduleId, submoduleId } = resolvedParams;

    // Remove from module's submodules array
    await UserModule.findByIdAndUpdate(moduleId, {
      $pull: { submodules: submoduleId },
    });

    return NextResponse.json({
      success: true,
      message: "Submodule reference removed from module",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
