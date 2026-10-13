import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import fs from 'fs';
import path from 'path';

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

    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid application IDs' });
    }

    // Validate all IDs are valid ObjectIds
    const validIds = applicationIds
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid application IDs provided' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');
    const applicationsCollection = db.collection('applications');

    // Fetch applications first to get export folder paths
    const applications = await applicationsCollection
      .find({
        _id: { $in: validIds },
        userId,
      })
      .toArray();

    if (applications.length === 0) {
      return res.status(404).json({ error: 'No applications found' });
    }

    // Delete export folders
    let foldersDeleted = 0;
    const folderErrors: string[] = [];

    for (const app of applications) {
      if (app.export_location && typeof app.export_location === 'string') {
        const normalizedExportPath = path.normalize(app.export_location);
        const folderExists = fs.existsSync(normalizedExportPath);

        if (folderExists) {
          try {
            fs.rmSync(normalizedExportPath, { recursive: true, force: true });
            foldersDeleted++;
          } catch (folderErr: any) {
            console.error(`Failed to delete export folder for ${app._id}:`, folderErr);
            folderErrors.push(`Failed to delete folder for ${app.company_info?.name || 'Unknown'}: ${folderErr.message}`);
          }
        }
      }
    }

    // Delete applications
    const result = await applicationsCollection.deleteMany({
      _id: { $in: validIds },
      userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Applications deleted successfully',
      deleted: {
        applications: result.deletedCount,
        folders: foldersDeleted,
      },
      folderErrors: folderErrors.length > 0 ? folderErrors : undefined,
    });
  } catch (error) {
    console.error('Error deleting applications:', error);
    return res.status(500).json({ 
      error: 'Failed to delete applications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
