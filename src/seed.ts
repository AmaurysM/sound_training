import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import UserModel from '@/models/User'; // adjust path if needed
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sound_training';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing users (optional)
    await UserModel.deleteMany({});
    console.log('Existing users cleared');

    // Seed users
    const users = [
      {
        name: 'Alice Coordinator',
        username: 'alice',
        password: await bcrypt.hash('password123', 10),
        role: 'Coordinator',
      },
      {
        name: 'Tom Trainer',
        username: 'tom',
        password: await bcrypt.hash('password123', 10),
        role: 'Trainer',
      },
      {
        name: 'Tina Trainee',
        username: 'tina',
        password: await bcrypt.hash('password123', 10),
        role: 'Trainee',
        //studentId: 'S12345',
      },
    ];

    await UserModel.insertMany(users);
    console.log('Seed data inserted!');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
