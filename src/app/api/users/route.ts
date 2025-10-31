// src/app/api/users/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcrypt";

// GET users
export async function GET(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const users = await User.find({
    name: { $regex: query, $options: "i" },
  }).select("-password");

  return NextResponse.json(users);
}

// POST: Create new user
export async function POST(req: Request) {
  await connectToDatabase();
  const body = await req.json();
  const { username, password, role, name } = body;

  if (!username || !password || !role || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Hash password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    password: hashedPassword,
    role,
    name,
  });

  await newUser.save();

  // Exclude password in response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = newUser.toObject();
  return NextResponse.json(userWithoutPassword, { status: 201 });
}

// PATCH: Update existing user
export async function PATCH(req: Request) {
  await connectToDatabase();
  const body = await req.json();
  const { id, username, password, role, name, archived } = body;

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (username) updateData.username = username;
  if (password) updateData.password = await bcrypt.hash(password, 10);
  if (role) updateData.role = role;
  if (name) updateData.name = name;
  if (archived !== undefined) updateData.archived = archived;

  const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updatedUser);
}
