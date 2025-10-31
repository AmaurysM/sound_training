// src/app/api/signature/[signatureId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Signature from "@/models/Signature";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ signatureId: string}> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params; // <-- unwrap the Promise
    const { signatureId } = resolvedParams;

    // Find the signature
    const signature = await Signature.findById(signatureId);
    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Signature not found" },
        { status: 404 }
      );
    }

    // Soft delete
    signature.deleted = true;
    await signature.save();

    return NextResponse.json({
      success: true,
      message: "Signature soft deleted",
      data: signature,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error },
      { status: 400 }
    );
  }
}
