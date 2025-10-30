// src/app/api/signature/[signatureId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Signature from "@/models/Signature";
import { connectToDatabase } from "@/lib/mongodb";

// interface Params {
//   signatureId: string;
// }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ signatureId: string}> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params; // <-- unwrap the Promise
    const { signatureId } = resolvedParams;
    console.log(signatureId)
    // Find the signature
    const signature = await Signature.findById(signatureId);
    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Signature not found" },
        { status: 404 }
      );
    }
    console.log(signature)

    // Soft delete
    signature.deleted = true;
    await signature.save();

    return NextResponse.json({
      success: true,
      message: "Signature soft deleted",
      data: signature,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
