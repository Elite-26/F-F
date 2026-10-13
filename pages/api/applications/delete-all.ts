import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
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

    const client = await clientPromise;
    const db = client.db();
    const applicationsCollection = db.collection('applications');
    const urlsCollection = db.collection('urls');

    // Delete all applications for this user
    // Include documents without userId (legacy data before multi-user support)
    const applicationsResult = await applicationsCollection.deleteMany({ 
      $or: [
        { userId }, 
        { userId: { $exists: false } }
      ]
    });
    
    // Delete all rejected URLs for this user
    // Include documents without userId (legacy data before multi-user support)
    const urlsResult = await urlsCollection.deleteMany({ 
      $or: [
        { userId }, 
        { userId: { $exists: false } }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'All data deleted successfully',
      deleted: {
        applications: applicationsResult.deletedCount,
        rejectedUrls: urlsResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error deleting user data:', error);
    return res.status(500).json({ 
      error: 'Failed to delete data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

