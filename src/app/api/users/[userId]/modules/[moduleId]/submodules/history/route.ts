// src/app/api/users/[userId]/modules/[moduleId]/submodules/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSubmodule from "@/models/UserSubmodule";
import UserModule from "@/models/UserModule";
import { connectToDatabase } from "@/lib/mongodb";

// ✅ GET all submodules for a module
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId?: string; moduleId?: string }> }
) {
  try {
    await connectToDatabase();

    // ✅ Safely unwrap params
    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams || {};

    // ✅ Validate params
    if (!userId || !moduleId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or moduleId in request." },
        { status: 400 }
      );
    }

    // ✅ Query submodules (included archived)
    const submodules = await UserSubmodule.find({
      module: moduleId,
      archived: { $ne: true },
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        populate: {
          path: "user",
          select: "_id name username role archived createdAt",
        },
      });

    return NextResponse.json({ success: true, data: submodules });
  } catch (error) {
    console.error("GET /submodules error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
