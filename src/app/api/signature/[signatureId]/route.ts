// src/app/api/signature/[signatureId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Signature from "@/models/Signature";
import { connectToDatabase } from "@/lib/mongodb";
import { ISignature, ITrainingSubmodule } from "@/models";
import UserSubmodule, { IUserSubmodule } from "@/models/UserSubmodule";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ signatureId: string }> }
) {
  try {
    const { signatureId } = await params;

    if (!signatureId) {
      return NextResponse.json(
        { error: "Missing Signature ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the signature
    const signature = await Signature.findById(signatureId);
    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Signature not found" },
        { status: 404 }
      );
    }

    // Soft delete
    signature.archived = true;
    await signature.save();

    // Find the attached submodule
    const submodule = await UserSubmodule.findById(signature.attachedTo)
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { archived: { $ne: true } },
      });

    if (!submodule) {
      return NextResponse.json(
        { success: false, error: "Attached submodule not found" },
        { status: 404 }
      );
    }

    // Recalculate signedOff
    const activeSignatures = submodule.signatures.length; // only non-archived populated
    const tSub = submodule.tSubmodule as ITrainingSubmodule | null;
    const requiresPractical = tSub?.requiresPractical ?? false;

    submodule.signedOff =
      activeSignatures >= 3 &&
      submodule.ojt &&
      (!requiresPractical || submodule.practical);

    await submodule.save();

    return NextResponse.json({
      success: true,
      message: "Signature archived and submodule updated",
      data: signature,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : error,
    }, { status: 400 });
  }
}
