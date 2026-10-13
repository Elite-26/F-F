import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { User, CreateUserInput } from '@/types/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');

    // Check if user already exists
    const existingUser = await db.collection<User>('users').findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create new user
    const newUser: CreateUserInput = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      role: 'user',
      approved: false, // New users need admin approval
    };

    const result = await db.collection<User>('users').insertOne({
      ...newUser,
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      userId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

