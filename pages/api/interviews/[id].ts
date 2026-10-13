import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { Interview } from '../../../types/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');

    // Get the user's ObjectId from email
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user._id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Interview ID is required' });
    }

    const interviewsCollection = db.collection<Interview>('interviews');

    if (req.method === 'PUT') {
      // Update interview
      const {
        date,
        interviewers,
        type,
        savedVideoLocation,
        feedback,
        content,
        duration,
      } = req.body;

      const updateData: Partial<Interview> = {
        updatedAt: new Date(),
      };

      if (date !== undefined) updateData.date = new Date(date);
      if (interviewers !== undefined) updateData.interviewers = interviewers;
      if (type !== undefined) {
        const validTypes = ['phone', 'agency', 'HR', 'tech_qa', 'live_coding', 'system_design', 'tech_discuss', 'culture'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ error: 'Invalid interview type' });
        }
        updateData.type = type;
      }
      if (savedVideoLocation !== undefined) updateData.savedVideoLocation = savedVideoLocation;
      if (feedback !== undefined) updateData.feedback = feedback;
      if (content !== undefined) updateData.content = content;
      if (duration !== undefined) updateData.duration = duration;

      const result = await interviewsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), userId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      return res.status(200).json({
        success: true,
        interview: {
          _id: result._id.toString(),
          applicationId: result.applicationId.toString(),
          userId: result.userId.toString(),
          date: result.date,
          interviewers: result.interviewers,
          type: result.type,
          savedVideoLocation: result.savedVideoLocation,
          feedback: result.feedback,
          content: result.content,
          duration: result.duration,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        message: 'Interview updated successfully',
      });
    } else if (req.method === 'DELETE') {
      // Delete interview
      const result = await interviewsCollection.deleteOne({
        _id: new ObjectId(id),
        userId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Interview deleted successfully',
      });
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling interview:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

