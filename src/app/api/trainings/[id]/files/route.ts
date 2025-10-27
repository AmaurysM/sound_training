// src/app/api/trainings/[id]/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import TrainingFile from "@/models/TrainigFiles";

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
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  try {
    // Await params in Next.js 15+
    const { id } = await params;

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
      trainingId: id,
      fileName: file.name,
      fileType: file.type,
      url,
    });

    return NextResponse.json(newFile);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

// GET method - retrieve files for a training
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  try {
    const { id } = await params;

    const files = await TrainingFile.find({ trainingId: id }).sort({ createdAt: -1 });

    return NextResponse.json(files);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch files" },
      { status: 500 }
    );
  }
}

// export async function DELETE(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string; fileId: string }> }
// ) {
//   await connectToDatabase();

//   try {
//     const { id, fileId } = await params;

//     // Find the file in database
//     const file = await TrainingFile.findOne({
//       _id: fileId,
//       trainingId: id,
//     });

//     if (!file) {
//       return NextResponse.json({ error: "File not found" }, { status: 404 });
//     }

//     // Extract S3 key from URL
//     // URL format: https://bucket-name.s3.region.amazonaws.com/key
//     const urlParts = file.url.split('/');
//     const key = urlParts[urlParts.length - 1];

//     // Delete from S3
//     try {
//       await s3.send(
//         new DeleteObjectCommand({
//           Bucket: process.env.AWS_BUCKET_NAME!,
//           Key: key,
//         })
//       );
//     } catch (s3Error) {
//       console.error("S3 deletion error:", s3Error);
//       // Continue with database deletion even if S3 fails
//     }

//     // Delete from MongoDB
//     await TrainingFile.deleteOne({ _id: fileId });

//     return NextResponse.json({ 
//       success: true, 
//       message: "File deleted successfully" 
//     });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json(
//       { error: err.message || "Failed to delete file" },
//       { status: 500 }
//     );
//   }
// }


export const dynamic = "force-dynamic";