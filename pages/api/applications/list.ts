import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { Application, Status } from '../../../types/models';
import { ensureAllStatusesExist } from '../../../lib/initDatabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the current user's ID
    const userId = new ObjectId(session.user.id);

    await ensureAllStatusesExist();

    const client = await clientPromise;
    const db = client.db();
    const applicationsCollection = db.collection<Application>('applications');
    const statusesCollection = db.collection<Status>('statuses');

    // Fetch user's applications with their status information
    const applications = await applicationsCollection
      .aggregate([
        {
          $match: { userId }, // Filter by current user
        },
        {
          $lookup: {
            from: 'statuses',
            localField: 'status',
            foreignField: '_id',
            as: 'statusInfo',
          },
        },
        {
          $unwind: {
            path: '$statusInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { createdAt: 1, _id: -1 },
        },
        {
          $project: {
            _id: 1,
            url: 1,
            isEasyApply: 1,
            title: 1,
            target: 1,
            company_info: 1,
            status: '$statusInfo.value',
            statusOrder: '$statusInfo.order',
            statusDescription: '$statusInfo.description',
            createdAt: 1,
            updatedAt: 1,
            appliedAt: 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      applications,
      count: applications.length,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch applications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

