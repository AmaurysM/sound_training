// src/app/api/trainings/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Training from "@/models/Training";
import User from "@/models/User";

// ✅ CREATE training and link to user
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const data = await req.json();

    const training = await Training.create(data);

    // Add to user's training list
    // await User.findByIdAndUpdate(training.user, { $push: { trainings: training._id } });
    await User.findByIdAndUpdate(
      training.user,
      { $push: { trainings: training._id } }, // adds training id to user's trainings array
      { new: true } // optional: returns updated user
    );

    return NextResponse.json(training, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 400 });
  }
}

// ✅ READ all trainings (with populated user + module)
export async function GET() {
  try {
    await connectToDatabase();
    const trainings = await Training.find()
      .populate("user", "name username role")
      .populate("module", "name description")
      .lean();
    return NextResponse.json(trainings);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch trainings" },
      { status: 500 }
    );
  }
}
