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

    if (req.method === 'GET') {
      // Get interviews for an application
      const { applicationId } = req.query;

      if (!applicationId || typeof applicationId !== 'string') {
        return res.status(400).json({ error: 'Application ID is required' });
      }

      const interviewsCollection = db.collection<Interview>('interviews');
      const interviews = await interviewsCollection
        .find({
          applicationId: new ObjectId(applicationId),
          userId,
        })
        .sort({ date: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        interviews: interviews.map((interview) => ({
          _id: interview._id.toString(),
          applicationId: interview.applicationId.toString(),
          userId: interview.userId.toString(),
          date: interview.date,
          interviewers: interview.interviewers,
          type: interview.type,
          savedVideoLocation: interview.savedVideoLocation,
          feedback: interview.feedback,
          content: interview.content,
          duration: interview.duration,
          createdAt: interview.createdAt,
          updatedAt: interview.updatedAt,
        })),
      });
    } else if (req.method === 'POST') {
      // Create a new interview
      const {
        applicationId,
        date,
        interviewers,
        type,
        savedVideoLocation,
        feedback,
        content,
        duration,
      } = req.body;

      if (!applicationId) {
        return res.status(400).json({ error: 'Application ID is required' });
      }

      if (!type) {
        return res.status(400).json({ error: 'Interview type is required' });
      }

      const validTypes = ['phone', 'agency', 'HR', 'tech_qa', 'live_coding', 'system_design', 'tech_discuss', 'culture'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid interview type' });
      }

      // Verify that the application belongs to the user
      const applicationsCollection = db.collection('applications');
      const application = await applicationsCollection.findOne({
        _id: new ObjectId(applicationId),
        userId,
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const interviewsCollection = db.collection<Interview>('interviews');
      const newInterview: Omit<Interview, '_id'> = {
        applicationId: new ObjectId(applicationId),
        userId,
        date: date ? new Date(date) : new Date(),
        interviewers,
        type,
        savedVideoLocation,
        feedback,
        content,
        duration,
        createdAt: new Date(),
      };

      const result = await interviewsCollection.insertOne(newInterview as any);

      return res.status(201).json({
        success: true,
        interview: {
          _id: result.insertedId.toString(),
          ...newInterview,
          applicationId: newInterview.applicationId.toString(),
          userId: newInterview.userId.toString(),
        },
        message: 'Interview created successfully',
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling interviews:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

