// src/app/api/users/[userId]/modules/[moduleId]/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

// DELETE method - delete a file
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; moduleId: string; fileId: string }> }
) {
  await connectToDatabase();

  try {
    const { moduleId, fileId } = await params; // ✅ use moduleId as trainingId

    // Find the file in database
    const file = await TrainingFile.findOne({
      _id: fileId,
      trainingId: moduleId, // ✅ correct
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Extract S3 key from URL
    let key = file.url.split('/').pop() || "";
    key = key.split("?")[0]; // Remove query params if present

    // Delete from S3
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
        })
      );
    } catch (s3Error) {
      console.error("S3 deletion error:", s3Error);
      // Continue with database deletion even if S3 fails
    }

    // Delete from MongoDB
    await TrainingFile.deleteOne({ _id: fileId });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete file" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
