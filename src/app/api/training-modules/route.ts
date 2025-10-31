import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingModule from "@/models/TrainingModule";

// ✅ CREATE a new training module
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const mod = await TrainingModule.create(body);
    return NextResponse.json(mod, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 400 });
  }
}

// ✅ READ all training modules
export async function GET() {
  try {
    await connectToDatabase();
    const modules = await TrainingModule.find().lean();
    return NextResponse.json(modules);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}
