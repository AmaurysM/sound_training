// api/training-modules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingModule from "@/models/TrainingModule";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [modules, total] = await Promise.all([
      TrainingModule.find(query)
        .populate('submodules')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TrainingModule.countDocuments(query)
    ]);

    return NextResponse.json({
      data: modules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/training-modules error:', error);
    return NextResponse.json(
      { error: "Failed to fetch training modules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Module name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingModule = await TrainingModule.findOne({ 
      name: body.name.trim() 
    });
    if (existingModule) {
      return NextResponse.json(
        { error: "A module with this name already exists" },
        { status: 409 }
      );
    }

    const newModule = await TrainingModule.create({
      ...body,
      name: body.name.trim(),
      description: body.description?.trim() || ''
    });

    return NextResponse.json(
      { data: newModule, message: "Module created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/training-modules error:', error);
    return NextResponse.json(
      { error: "Failed to create training module" },
      { status: 500 }
    );
  }
}