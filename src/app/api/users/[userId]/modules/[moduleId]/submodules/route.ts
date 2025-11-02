// src/app/api/users/[userId]/modules/[moduleId]/submodules/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSubmodule, { IUserSubmodule } from "@/models/UserSubmodule";
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

    // ✅ Query submodules (exclude archived)
    const submodules: IUserSubmodule[] = await UserSubmodule.find({
      module: moduleId,
      archived: { $ne: true },
    })
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { archived: { $ne: true } },
        populate: { path: "user", select: "_id name role archived" },
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

// ✅ POST - Create a new submodule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId?: string; moduleId?: string }> }
) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // ✅ Unwrap and validate params
    const resolvedParams = await params;
    const { userId, moduleId } = resolvedParams || {};
    if (!userId || !moduleId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or moduleId in request." },
        { status: 400 }
      );
    }

    // ✅ Validate required fields in body
    if (!body.tSubmodule) {
      return NextResponse.json(
        { success: false, error: "Missing required field: tSubmodule." },
        { status: 400 }
      );
    }

    // ✅ Verify the module exists and belongs to the user
    const mod = await UserModule.findOne({
      _id: moduleId,
      user: userId,
      archived: { $ne: true },
    });

    if (!mod) {
      return NextResponse.json(
        { success: false, error: "Module not found or archived." },
        { status: 404 }
      );
    }

    // ✅ Create the submodule
    const submodule = await UserSubmodule.create({
      module: moduleId,
      tSubmodule: body.tSubmodule,
      ojt: body.ojt ?? false,
      practical: body.practical ?? false,
      signedOff: body.signedOff ?? false,
      signatures: body.signatures ?? [],
    });

    // ✅ Add submodule reference to module
    await UserModule.findByIdAndUpdate(moduleId, {
      $push: { submodules: submodule._id },
    });

    // ✅ Populate filtered result
    const populated = await UserSubmodule.findById(submodule._id)
      .populate("tSubmodule")
      .populate({
        path: "signatures",
        match: { archived: { $ne: true } },
        populate: { path: "user", select: "_id name role archived" },
      });

    return NextResponse.json(
      { success: true, data: populated },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /submodules error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
