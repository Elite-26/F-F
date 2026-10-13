import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { ensureAllStatusesExist, getStatusByValue } from '../../../lib/initDatabase';

interface ImportApplication {
  company_info?: {
    name?: string;
    salary?: string;
    other?: string;
  };
  title?: string;
  link?: string;
  job_description?: string;
  analyze_result?: {
    stack?: string[];
    mindset?: string;
    ownership?: string;
    environment?: string;
    responsibility?: string[];
  };
  raw_jd?: string;
  comment?: string;
}

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

    const { applications, target } = req.body;

    if (!Array.isArray(applications) || applications.length === 0) {
      return res.status(400).json({ error: 'Invalid applications data' });
    }

    // Validate each application has required fields
    const validationErrors: string[] = [];
    applications.forEach((app: ImportApplication, index: number) => {
      if (!app.company_info || !app.company_info.name) {
        validationErrors.push(`Application ${index + 1}: Missing company_info.name`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    await ensureAllStatusesExist();
    const freshStatus = await getStatusByValue('fresh');

    if (!freshStatus) {
      return res.status(500).json({ error: 'Failed to get fresh status' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');
    const applicationsCollection = db.collection('applications');

    const now = new Date();
    const insertedApplications = [];

    // Insert applications
    for (const app of applications) {
      const applicationData = {
        userId,
        url: app.link || '',
        isEasyApply: !app.link || app.link.trim() === '',
        status: freshStatus._id,
        target: target || undefined,
        company_info: app.company_info || {},
        title: app.title || undefined,
        raw_jd: app.job_description || app.raw_jd || undefined,
        analyze_result: app.analyze_result || undefined,
        comment: app.comment || undefined,
        createdAt: now,
      };

      try {
        const result = await applicationsCollection.insertOne(applicationData);
        insertedApplications.push(result.insertedId.toString());
      } catch (err: any) {
        // Skip duplicate URLs (due to unique index)
        if (err.code === 11000) {
          console.log(`Skipping duplicate URL: ${app.link}`);
          continue;
        }
        throw err;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Applications imported successfully',
      imported: insertedApplications.length,
      total: applications.length,
      applicationIds: insertedApplications,
    });
  } catch (error) {
    console.error('Error importing applications:', error);
    return res.status(500).json({ 
      error: 'Failed to import applications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
