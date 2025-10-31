// src/app/api/users/[userId]/modules/[moduleId]/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import TrainingFile from "@/models/TrainigFiles"; // FIXED typo

// Connect to MongoDB
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI!);
};

// S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.KEY_ID!,
    secretAccessKey: process.env.SECRET_AWS_ID!,
  },
});

// POST method
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> } // fix params typing
) {
  await connectToDatabase();

  try {
    const { moduleId } = await params; // use moduleId as trainingId

    // Parse the FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const uploadedBy = formData.get("uploadedBy") as string;
    const uploadedById = formData.get("uploadedById") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3
    const key = `${Date.now()}_${file.name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Save metadata in MongoDB
    const newFile = await TrainingFile.create({
      trainingId: moduleId, // ✅ corrected
      fileName: file.name,
      fileType: file.type,
      url,
      uploadedBy,
      uploadedById,
    });

    return NextResponse.json(newFile);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

// GET method - retrieve files for a training
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string }> }
) {
  await connectToDatabase();

  try {
    const { moduleId } = await params;

    const files = await TrainingFile.find({ trainingId: moduleId }).sort({ createdAt: -1 });

    return NextResponse.json(files);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch files" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
