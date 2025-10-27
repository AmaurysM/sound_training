// src/app/api/trainings/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Training, Signature, ISignature } from "@/models";
import mongoose from "mongoose";

// GET training by ID
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    console.log(id)

    const training = await Training.findById(id)
      .populate("user", "name username role")
      .populate("module", "name description")
      .populate({
        path: "signatures",
        model: "Signature",
        select: "userId userName role signedAt",
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

// PATCH - add signature or update training
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const updates = await req.json();

    const training = await Training.findById(id);
    if (!training) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 1️⃣ Handle full signatures array update
    if (updates.signatures && Array.isArray(updates.signatures)) {
      const updatedSignatureIds: mongoose.Types.ObjectId[] = [];

      for (const sig of updates.signatures) {
        let signatureDoc;

        if ((sig as ISignature)._id) {
          // Update existing signature by _id
          signatureDoc = await Signature.findByIdAndUpdate(
            (sig as ISignature)._id,
            { userId: sig.userId, userName: sig.userName, role: sig.role, signedAt: sig.signedAt },
            { new: true }
          );
        } else {
          // Create new signature if _id not provided
          signatureDoc = await Signature.create({
            userId: sig.userId,
            userName: sig.userName,
            role: sig.role,
            signedAt: sig.signedAt || new Date(),
            trainingId: id,
          });
        }

        if (signatureDoc) updatedSignatureIds.push(signatureDoc._id);
      }

      training.signatures = updatedSignatureIds;
    }

    // 2️⃣ Handle single signature add (legacy)
    if (updates.addSignature) {
      const newSig = await Signature.create({
        userId: updates.addSignature.userId,
        userName: updates.addSignature.userName,
        role: updates.addSignature.role,
        signedAt: new Date(),
        trainingId: id,
      });

      training.signatures.push(newSig._id);
    }

    // 3️⃣ Apply other updates
    if (updates.signedOff !== undefined) training.signedOff = updates.signedOff;
    if (updates.ojt !== undefined) training.ojt = updates.ojt;
    if (updates.practical !== undefined) training.practical = updates.practical;
    if (updates.notes !== undefined) training.notes = updates.notes;

    // Save training
    await training.save();

    // Populate and return
    const finalTraining = await Training.findById(id)
      .populate("user", "name username role")
      .populate("module", "name description")
      .populate({
        path: "signatures",
        model: "Signature",
        select: "userId userName role signedAt",
      })
      .lean();

    return NextResponse.json(finalTraining);
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json(
      { error: "Update failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}


// ✅ DELETE training (and its signatures)
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;

    // Delete all associated signatures first
    await Signature.deleteMany({ trainingId: id });

    // Then delete the training
    const deleted = await Training.findByIdAndDelete(id);

    if (!deleted)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      {
        error: "Delete failed",
      },
      { status: 500 }
    );
  }
}
