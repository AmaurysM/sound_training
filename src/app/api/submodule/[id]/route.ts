import { ISignature } from '@/models/types';
// src/app/api/submodule/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingSubmodule from "@/models/TrainingSubModule";
import Signature from '@/models/Signature';
import UserSubmodule from '@/models/UserSubmodule';


// GET a specific submodule
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const submodule = await UserSubmodule.findById(id)
      .populate({
        path: "signatures",
        model: "Signature",
        select: "attatchedTo createdAt",
        populate: {
          path: "user",
          model: "User",
          select: "name role archived"
        }
      })
      .populate({
        path: "tSubmodules",
        model: "TrainingSubModule",
        select: "code title requiresPractical description"
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

    const submodule = await TrainingSubmodule.findById(id);
    if (!submodule) {
      return NextResponse.json({ error: "Submodule not found" }, { status: 404 });
    }

    // Update boolean flags
    if (updates.ojt !== undefined) submodule.ojt = updates.ojt;
    if (updates.practical !== undefined) submodule.practical = updates.practical;
    if (updates.signedOff !== undefined) submodule.signedOff = updates.signedOff;

    // Handle new signatures
    if (updates.signatures !== undefined) {
      const sigs: ISignature[] =
        typeof updates.signatures === "string" ? JSON.parse(updates.signatures) : updates.signatures;

      const newSigIds = await Promise.all(
        sigs.map(async (sig) => {
          const newSig = new Signature({
            user: sig.user,
            attachedTo: submodule.moduleId,
          });
          await newSig.save();
          return newSig._id;
        })
      );

      // Push new signature IDs into the submodule's signatures array
      submodule.signatures.push(...newSigIds);
    }

    // Clear signatures if ojt or practical is turned off
    if (updates.ojt === false || updates.practical === false) {
      submodule.signedOff = false;
      submodule.signatures = [];
    }

    await submodule.save();

    // Populate signatures before returning
    await submodule.populate({
      path: "signatures",
      model: "Signature",
      select: "userId userName role signedAt",
    });

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