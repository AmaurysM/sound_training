import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// ✅ READ single user
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await User.findById(params.id)
      .populate({
        path: "trainings",
        populate: {
          path: "module",
          model: "TrainingModule", // explicitly tell Mongoose what model to use
        },
      })
      .lean();
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error("Error fetching user:", err);
    return NextResponse.json({ error: "Error fetching user" }, { status: 500 });
  }
}

// ✅ UPDATE user (no password change here)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const updates = await req.json();
    const updated = await User.findByIdAndUpdate(params.id, updates, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

// ✅ ARCHIVE user (instead of delete)
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(params.id, { archived: true }, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "User archived" });
  } catch {
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
