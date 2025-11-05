// src/app/api/users/[userId]/modules/[moduleId]/submodules/[submoduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import UserSubmodule from "@/models/UserSubmodule";
import Signature from "@/models/Signature";
import { connectToDatabase } from "@/lib/mongodb";
import { ITrainingSubmodule, IUser, IUserSubmodule } from "@/models";
import "@/models/TrainingSubmodule";

// 🔒 Helper for ID validation
function validateObjectIds(ids: Record<string, string>) {
  for (const [key, value] of Object.entries(ids)) {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return { valid: false, error: `Invalid ${key}` };
    }
  }
  return { valid: true };
}

// ✅ GET single submodule
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

    const { userId, moduleId, submoduleId } = await params;

    // 🧩 Validate IDs
    const validation = validateObjectIds({ userId, moduleId, submoduleId });
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const submodule = await UserSubmodule.findOne({
      _id: submoduleId,
      module: moduleId,
      archived: { $ne: true },
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { archived: { $ne: true } },
        populate: { path: "user", select: "_id name role archived nickname" },
      });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Submodule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: submodule });
  } catch (error) {
    console.error("GET /submodule error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : error },
      { status: 400 }
    );
  }
}

// ✅ PATCH - Update submodule
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
    const { userId, moduleId, submoduleId } = await params;

    // 🧩 Validate IDs
    const validation = validateObjectIds({ userId, moduleId, submoduleId });
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 🔍 Load the submodule
    const submodule = await UserSubmodule.findOne({
      _id: submoduleId,
      module: moduleId,
      archived: { $ne: true },
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { archived: { $ne: true } },
      });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Submodule not found" },
        { status: 404 }
      );
    }

    // ✏️ Update editable fields
    if (typeof body.ojt === "boolean") submodule.ojt = body.ojt;
    if (typeof body.practical === "boolean") submodule.practical = body.practical;

    // ✍️ Add new signature if requested
    if (body.addSignature?.userId) {
      const { userId: signerId, signAsRole } = body.addSignature;

      if (!mongoose.Types.ObjectId.isValid(signerId)) {
        return NextResponse.json(
          { success: false, error: "Invalid signature userId" },
          { status: 400 }
        );
      }

      const newSignature = await Signature.create({
        user: signerId,
        attachedTo: submodule._id,
        role: signAsRole,
      });

      submodule.signatures.push(newSignature._id);
    }

    // 🧮 Refresh signatures to count only active ones
    const activeSignatures = await Signature.countDocuments({
      _id: { $in: submodule.signatures },
      archived: { $ne: true },
    });

    // ✅ Check training submodule requirements
    const tSub = submodule.tSubmodule as ITrainingSubmodule | null;
    const requiresPractical = tSub?.requiresPractical ?? false;

    // 🧠 Correct sign-off logic:
    // Must have: OJT completed, practical (if required), and >= 3 active signatures
    const isSignedOff =
      activeSignatures >= 3 &&
      submodule.ojt &&
      (!requiresPractical || submodule.practical);

    submodule.signedOff = isSignedOff;

    await submodule.save();

    // 🎯 Re-populate for response
    const populatedSubmodule = await UserSubmodule.findById(submodule._id)
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { archived: { $ne: true } },
        populate: { path: "user", select: "_id name role archived nickname" },
      });

    console.log(
      `[PATCH] Submodule ${submodule._id} signedOff: ${isSignedOff} | ` +
      `Requires Practical: ${requiresPractical} | ` +
      `OJT: ${submodule.ojt} | Practical: ${submodule.practical} | Active Signatures: ${activeSignatures}`
    );

    return NextResponse.json({ success: true, data: populatedSubmodule });
  } catch (error) {
    console.error("PATCH /submodule error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : error },
      { status: 400 }
    );
  }
}


// ✅ DELETE - Soft delete submodule
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

    const { userId, moduleId, submoduleId } = await params;

    // 🧩 Validate IDs
    const validation = validateObjectIds({ userId, moduleId, submoduleId });
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const submodule = await UserSubmodule.findByIdAndUpdate(submoduleId, {
      archived: true,
    });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Submodule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Submodule archived successfully",
    });
  } catch (error) {
    console.error("DELETE /submodule error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : error },
      { status: 400 }
    );
  }
}
