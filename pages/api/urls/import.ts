import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { getStatusByValue } from '../../../lib/initDatabase';
import { Application, RejectedUrl } from '../../../types/models';

// URL validation function
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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

    const { urls, target } = req.body;

    if (!urls || typeof urls !== 'string') {
      return res.status(400).json({ error: 'URLs must be provided as a string' });
    }

    if (!target || typeof target !== 'string' || !target.trim()) {
      return res.status(400).json({ error: 'Job target is required' });
    }

    // Split URLs by newlines and filter empty lines
    const urlList = urls
      .split('\n')
      .map((url: string) => url.trim())
      .filter((url: string) => url.length > 0);

    if (urlList.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }

    const client = await clientPromise;
    const db = client.db();
    const applicationsCollection = db.collection<Omit<Application, '_id'>>('applications');
    const urlsCollection = db.collection<Omit<RejectedUrl, '_id'>>('urls');

    // Get the "fresh" status
    const freshStatus = await getStatusByValue('fresh');
    
    if (!freshStatus) {
      return res.status(500).json({ 
        error: 'Database not initialized. Please initialize the database first.' 
      });
    }

    const validUrls: string[] = [];
    const duplicateUrls: string[] = [];
    const invalidUrls: string[] = [];

    // Validate and categorize URLs
    for (const url of urlList) {
      // Check if URL is valid format
      if (!isValidUrl(url)) {
        invalidUrls.push(url);
        continue;
      }

      // Check if URL already exists in user's applications collection
      const existingApplication = await applicationsCollection.findOne({ 
        userId, 
        url 
      });
      
      if (existingApplication) {
        duplicateUrls.push(url);
        continue;
      }

      validUrls.push(url);
    }

    // Save valid URLs to applications collection
    if (validUrls.length > 0) {
      const applications = validUrls.map(url => ({
        userId,
        url,
        isEasyApply: false,
        status: freshStatus._id,
        target: target.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await applicationsCollection.insertMany(applications);
    }

    // Save duplicate URLs to rejected URLs collection
    if (duplicateUrls.length > 0) {
      const rejectedUrls = duplicateUrls.map(url => ({
        userId,
        value: url,
        tag: 'duplicated',
        createdAt: new Date(),
      }));

      await urlsCollection.insertMany(rejectedUrls);
    }

    // Return results
    return res.status(200).json({
      success: true,
      validCount: validUrls.length,
      duplicateCount: duplicateUrls.length,
      invalidCount: invalidUrls.length,
      message: `Successfully imported ${validUrls.length} URL(s). ${duplicateUrls.length} duplicate(s) and ${invalidUrls.length} invalid URL(s) were rejected.`,
      details: {
        valid: validUrls,
        duplicates: duplicateUrls,
        invalid: invalidUrls,
      },
    });
  } catch (error) {
    console.error('Error importing URLs:', error);
    return res.status(500).json({ 
      error: 'Failed to import URLs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

