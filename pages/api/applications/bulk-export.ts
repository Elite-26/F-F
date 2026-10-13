import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
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

    // Fetch applications
    const applications = await applicationsCollection
      .find({
        _id: { $in: validIds },
        userId,
      })
      .toArray();

    if (applications.length === 0) {
      return res.status(404).json({ error: 'No applications found' });
    }

    // Format applications for export
    const exportData = applications.map((app) => ({
      company_info: app.company_info || {},
      title: app.title || '',
      link: app.url || '',
      job_description: app.raw_jd || '',
      analyze_result: app.analyze_result || {},
      raw_jd: app.raw_jd || '',
      comment: app.comment || '',
    }));

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="applications-export-${Date.now()}.json"`);

    return res.status(200).json(exportData);
  } catch (error) {
    console.error('Error exporting applications:', error);
    return res.status(500).json({ 
      error: 'Failed to export applications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
