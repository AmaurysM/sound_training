import { NextApiRequest, NextApiResponse } from 'next';
import { jwtVerify } from "jose";
import UserModel, { IUser } from '@/models/User'; // mongoose model

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.token; // HTTP-only cookie
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const user = await UserModel.findById(payload.id).lean<IUser>(); // ✅ type fix

    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    // Pick only necessary fields to return
    const safeUser = {
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    res.status(200).json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Not authenticated' });
  }
}
