// src/app/api/users/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Training from "@/models/Training"; // ← ADD THIS
import TrainingModule from "@/models/TrainingModule"; // ← ADD THIS

// ✅ READ single user
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    
    const user = await User.findById(id)
      .populate({
        path: "trainings",
        populate: {
          path: "module",
          model: "TrainingModule",
        },
      })
      .lean();

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error("Error fetching user:", err);
    return NextResponse.json({ 
      error: "Error fetching user", 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// ✅ UPDATE user (no password change here)
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const updates = await req.json();
    const updated = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

// ✅ ARCHIVE user (instead of delete)
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const updated = await User.findByIdAndUpdate(id, { archived: true }, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "User archived" });
  } catch {
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}