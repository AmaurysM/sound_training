// src/app/api/register/resend/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";
import { sendRegistrationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json(
        { error: "User already verified" },
        { status: 400 }
      );
    }

    // Generate new token
    const registrationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.registrationToken = registrationToken;
    user.tokenExpires = tokenExpires;
    
    await user.save();

    // Send new registration email
    await sendRegistrationEmail(email, registrationToken);

    return NextResponse.json({ 
      success: true,
      message: "New registration email sent" 
    });
  } catch (error) {
    console.error("Error resending registration email:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}