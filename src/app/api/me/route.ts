// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";
import { jwtVerify } from "jose";
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    // Read the cookie from request headers
    const cookieHeader = req.headers.get("cookie") || "";
    const token = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Verify JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await UserModel.findById(payload.id).lean<any>();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const safeUser = {
      _id: user._id,
      name: user.name, // ✅ TypeScript now recognizes this
      username: user.username,
      role: user.role,
      studentId: user.studentId,
    };

    console.log(user)

    return NextResponse.json(safeUser);
  } catch (err) {
    console.error("Authentication error:", err);
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
