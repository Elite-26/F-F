import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';

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
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db();
    const statusesCollection = db.collection('statuses');

    // Check if statuses collection has any documents
    const statusCount = await statusesCollection.countDocuments();

    return res.status(200).json({
      initialized: statusCount > 0,
      statusCount,
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    return res.status(500).json({ 
      error: 'Failed to check database status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

