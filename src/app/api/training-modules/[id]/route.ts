import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingModule from "@/models/TrainingModule";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectToDatabase();

    // ✅ Populate submodules
    const mod = await TrainingModule.findById(id)
      .populate({
        path: "submodules",       // field to populate
        select: "code title requiresPractical", // optional: select specific fields
      })
      .lean();

    if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mod);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error fetching module" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const updates = await req.json();
    const updated = await TrainingModule.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    await TrainingModule.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
