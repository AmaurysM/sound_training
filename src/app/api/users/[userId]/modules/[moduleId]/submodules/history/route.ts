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

    console.log(userId, moduleId)

    // ✅ Validate params
    if (!userId || !moduleId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or moduleId in request." },
        { status: 400 }
      );
    }

    // ✅ Query submodules (included soft-deleted)
    const submodules = await UserSubmodule.find({
      module: moduleId,
      deleted: { $ne: true },
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        // match: { deleted: { $ne: true } },
        populate: { path: "user", select: "_id name role" },
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