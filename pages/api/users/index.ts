import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';
import { User, SafeUser } from '@/types/models';
import { ObjectId } from 'mongodb';
import { normalizeResumeTemplate, RESUME_TEMPLATES } from '@/lib/resume/template-ids';
import { normalizeExperienceOption, EXPERIENCE_OPTIONS } from '@/lib/resume/experience-option';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admins can access user management
  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('fandf');

    if (req.method === 'GET') {
      // Get all users
      const users = await db.collection<User>('users').find({}).toArray();

      const safeUsers: SafeUser[] = users.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        approved: user.approved,
        resumeTemplate: normalizeResumeTemplate(user.resumeTemplate),
        experienceOption: normalizeExperienceOption(user.experienceOption),
        createdAt: user.createdAt,
      }));

      return res.status(200).json({ users: safeUsers });
    } else if (req.method === 'PATCH') {
      // Update user (approve/reject or change role)
      const { userId, approved, role, resumeTemplate, experienceOption } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const updateData: any = {};
      if (typeof approved === 'boolean') {
        updateData.approved = approved;
      }
      if (role && (role === 'admin' || role === 'user')) {
        updateData.role = role;
      }
      if (typeof resumeTemplate === 'string' && (RESUME_TEMPLATES as readonly string[]).includes(resumeTemplate)) {
        updateData.resumeTemplate = resumeTemplate;
      }
      if (typeof experienceOption === 'string' && (EXPERIENCE_OPTIONS as readonly string[]).includes(experienceOption)) {
        updateData.experienceOption = experienceOption;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateData.updatedAt = new Date();

      const result = await db.collection<User>('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ message: 'User updated successfully' });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User management error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

