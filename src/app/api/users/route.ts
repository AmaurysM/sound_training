// src/app/api/users/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendRegistrationEmail } from "@/lib/email";

// GET users
export async function GET(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const users = await User.find({
    name: { $regex: query, $options: "i" },
  }).select("-password -registrationToken -tokenExpires");

  return NextResponse.json(users);
}

// POST: Create new user
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { fullName, username, email, role } = body;

    if (!fullName || !username || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this username or email already exists" },
        { status: 409 }
      );
    }

    // Generate secure registration token
    const registrationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (no password yet) - map fullName to name
    const newUser = new User({
      name: fullName, // Map fullName to name field
      username,
      email,
      role,
      isVerified: false,
      registrationToken,
      tokenExpires,
    });

    await newUser.save();

    // Send registration email with token
    await sendRegistrationEmail(email, registrationToken);

    // Remove sensitive fields from response
    const userObject = newUser.toObject();
    delete userObject.password;
    delete userObject.registrationToken;
    delete userObject.tokenExpires;

    return NextResponse.json(
      { success: true, user: userObject },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
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

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  }).select("-password -registrationToken -tokenExpires");

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updatedUser);
}