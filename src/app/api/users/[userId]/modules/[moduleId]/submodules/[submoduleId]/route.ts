// src/app/api/users/[userId]/modules/[moduleId]/submodules/[submoduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSubmodule from "@/models/UserSubmodule";
import UserModule from "@/models/UserModule";
import Signature from "@/models/Signature";
import { connectToDatabase } from "@/lib/mongodb";

// ✅ GET single submodule (ignore deleted submodules and signatures)
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
      deleted: { $ne: true }, // ✅ skip soft-deleted submodules
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { deleted: { $ne: true } }, // ✅ skip soft-deleted signatures
        populate: { path: "user", select: "_id name role" },
      });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Submodule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: submodule });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}

// ✅ PATCH - Update submodule (and filter deleted signatures in response)
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

    // Only allow updates to active (non-deleted) submodules
    const submodule = await UserSubmodule.findOne({
      _id: submoduleId,
      module: moduleId,
      deleted: { $ne: true },
    });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Submodule not found" },
        { status: 404 }
      );
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
        role: body.addSignature.signAsRole
      });
      submodule.signatures.push(newSignature._id);
    }

    await submodule.save();

    // ✅ Populate filtered result
    const populatedSubmodule = await UserSubmodule.findById(submodule._id)
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { deleted: { $ne: true } },
        populate: { path: "user", select: "_id name role" },
      });

    return NextResponse.json({ success: true, data: populatedSubmodule });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}

// ✅ DELETE - Soft delete submodule instead of full removal
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
    const { moduleId, submoduleId } = resolvedParams;

    // Mark the submodule as deleted
    const submodule = await UserSubmodule.findByIdAndUpdate(submoduleId, {
      deleted: true,
    });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Submodule not found" },
        { status: 404 }
      );
    }

    // Optional: Keep reference in module but mark as deleted
    // (if you prefer removing it, uncomment below)
    // await UserModule.findByIdAndUpdate(moduleId, { $pull: { submodules: submoduleId } });

    return NextResponse.json({
      success: true,
      message: "Submodule soft-deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}
