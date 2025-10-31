import mongoose from 'mongoose';
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
