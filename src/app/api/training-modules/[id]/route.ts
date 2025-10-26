import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingModule from "@/models/TrainingModule";

// ✅ READ one module by ID
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const mod = await TrainingModule.findById(params.id).lean();
    if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mod);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error fetching module" },
      { status: 500 }
    );
  }
}

// ✅ UPDATE a module
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const updates = await req.json();
    const updated = await TrainingModule.findByIdAndUpdate(params.id, updates, {
      new: true,
    });
    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

// ✅ DELETE a module
export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    await TrainingModule.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
