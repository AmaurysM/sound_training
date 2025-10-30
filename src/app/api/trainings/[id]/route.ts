// api/trainings/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Training } from "@/models";
import TrainingSubModule from "@/models/TrainingSubModule";

// GET training by ID
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const training = await Training.findById(id)
      .populate("user", "name username role")
      .populate({
        path: "module",
        select: "name description submodules",
        populate: {
          path: "submodules",
          model: "TrainingSubModule",
          select: "title code description requiresPractical practical ojt signedOff",
          populate: {
            path: "signatures",
            model: "Signature",
            select: "userId userName role signedAt",
          },
        },
      })
      .lean();

    if (!training)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(training);
  } catch (err) {
    console.error("Error fetching training:", err);
    return NextResponse.json(
      { error: "Error fetching training" },
      { status: 500 }
    );
  }
}

// PATCH - update training (no signatures here)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const updates = await req.json();

    const training = await Training.findById(id);
    if (!training)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Apply updates
    if (updates.notes !== undefined) training.notes = updates.notes;
    if (updates.signedOff !== undefined) training.signedOff = updates.signedOff;
    if (updates.ojt !== undefined) training.ojt = updates.ojt;
    if (updates.practical !== undefined) training.practical = updates.practical;

    await training.save();

    // Return updated training with populated module + submodules
    const finalTraining = await Training.findById(id)
      .populate("user", "name username role")
      .populate({
        path: "module",
        select: "name description submodules",
        populate: {
          path: "submodules",
          model: "TrainingSubModule",
          select: "title code description requiresPractical practical ojt signedOff",
          populate: {
            path: "signatures",
            model: "Signature",
            select: "userId userName role signedAt",
          },
        },
      })
      .lean();

    return NextResponse.json(finalTraining);
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

// DELETE training (and its submodules & signatures)
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    // Find the training and module first
    const training = await Training.findById(id).populate("module", "_id");
    if (!training)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const moduleId =
      typeof training.module === "string"
        ? training.module
        : training.module?._id;

    // Delete all submodules for this module (signatures cascade via schema if needed)
    await TrainingSubModule.deleteMany({ moduleId });

    // Delete the training itself
    await Training.findByIdAndDelete(id);

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
