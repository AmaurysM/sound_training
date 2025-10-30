// src/app/api/submodule/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingSubmodule from "@/models/TrainingSubModule";

// GET a specific submodule
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const submodule = await TrainingSubmodule.findById(id)
      .populate({
        path: "signatures",
        model: "Signature",
        select: "userId userName role signedAt",
      })
      .lean();

    if (!submodule) {
      return NextResponse.json({ error: "Submodule not found" }, { status: 404 });
    }

    return NextResponse.json(submodule);
  } catch (err) {
    console.error("Error fetching submodule:", err);
    return NextResponse.json({ error: "Error fetching submodule" }, { status: 500 });
  }
}

// PATCH - update a specific submodule
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const updates = await req.json();

    console.log(id)

    const submodule = await TrainingSubmodule.findById(id);
    if (!submodule) {
      return NextResponse.json({ error: "Submodule not found" }, { status: 404 });
    }

    // Apply updates to allowed fields
    if (updates.ojt !== undefined) submodule.ojt = updates.ojt;
    if (updates.practical !== undefined) submodule.practical = updates.practical;
    if (updates.signedOff !== undefined) submodule.signedOff = updates.signedOff;
    if (updates.signatures !== undefined) submodule.signatures = updates.signatures;

    // If ojt or practical is being turned off, clear signatures and signedOff
    if (updates.ojt === false || updates.practical === false) {
      submodule.signedOff = false;
      submodule.signatures = [];
    }

    await submodule.save();

    return NextResponse.json(submodule);
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json(
      {
        error: "Update failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

// DELETE - delete a specific submodule
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const result = await TrainingSubmodule.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: "Submodule not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Submodule deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
