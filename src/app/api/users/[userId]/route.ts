// scr/app/api/users/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// Import all models at once to ensure registration
import { User } from "@/models";
import bcrypt from "bcrypt";

export async function GET(req: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    await connectToDatabase();
    
    const { userId } = await context.params;

    const user = await User.findById(userId)
      .populate('modules')
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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



export async function PATCH(req: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    await connectToDatabase();
    const { userId } = await context.params;
    const updates = await req.json();

    // Find user first
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Update base fields
    if (updates.name) user.name = updates.name.trim();
    if (updates.username) user.username = updates.username.trim();
    if (updates.role) user.role = updates.role;

    // Handle password update (hash securely)
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(updates.password, salt);
    }

    await user.save();

    // Return the updated user (without password)
    const sanitizedUser = {
      _id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      archived: user.archived,
      trainings: user.trainings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json(sanitizedUser, { status: 200 });
  } catch (err) {
    console.error("Error updating user:", err);
    return NextResponse.json(
      { error: "Update failed", details: err instanceof Error ? err.message : err },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    await connectToDatabase();
    const { userId } = await context.params;
    const updated = await User.findByIdAndUpdate(userId, { archived: true }, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "User archived" });
  } catch {
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}