// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  await connectToDatabase();
  const { username, password } = await req.json();

  const user = await User.findOne({ username });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return NextResponse.json({ error: "Invalid password" }, { status: 401 });

  // Generate JWT with jose
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ 
    id: user._id.toString(),
    role: user.role 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  // Return user and set HTTP-only cookie
  const response = NextResponse.json({
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
    },
  });

  response.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}