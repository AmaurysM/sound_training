import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Training from "@/models/Training";

// ✅ READ one training
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const training = await Training.findById(params.id)
      .populate("user", "name username role")
      .populate("module", "name description")
      .lean();

    if (!training) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(training);
  } catch {
    return NextResponse.json({ error: "Error fetching training" }, { status: 500 });
  }
}

// ✅ UPDATE training (e.g., sign-off or progress updates)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const updates = await req.json();
    const updated = await Training.findByIdAndUpdate(params.id, updates, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

// ✅ DELETE training
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const deleted = await Training.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
