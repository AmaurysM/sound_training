// src/app/api/register/complete/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ registrationToken: token });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 400 }
      );
    }

    // Check if token expired
    if (user.tokenExpires && new Date() > user.tokenExpires) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    // Hash password and update user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    user.password = hashedPassword;
    user.isVerified = true;
    user.registrationToken = undefined;
    user.tokenExpires = undefined;
    
    await user.save();

    return NextResponse.json({ 
      success: true,
      message: "Registration completed successfully" 
    });
  } catch (error) {
    console.error("Error completing registration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}