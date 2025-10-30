// src/app/api/module/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import UserModule from "@/models/UserModule";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const submodule = await UserModule.findById(id)
      .populate({
        path: "user",
        model: "User",
        select: "username name role archieved modules",
      })
      .populate({
        path: "tModule",
        model: "TrainingModule",
        select: "name description",
      })
      .populate({
        path: "submodules",
        model: "UserSubmodule",
        select: "ojt practical signedOff signatures"
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