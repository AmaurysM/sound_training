// src/app/api/register/validate/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ registrationToken: token }).select(
      "-password"
    );

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
        { 
          expired: true,
          user: {
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: {
        name: user.name,
        username:user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
