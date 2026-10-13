import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getStatusByValue } from '../../../lib/initDatabase';

const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { companyName, title, target, url } = req.body;

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!target || typeof target !== 'string' || !target.trim()) {
      return res.status(400).json({ error: 'Job target is required' });
    }

    let normalizedUrl = '';
    if (typeof url === 'string' && url.trim()) {
      if (!isValidUrl(url.trim())) {
        return res.status(400).json({ error: 'Please provide a valid URL or leave the field blank.' });
      }
      normalizedUrl = url.trim();
    }

    const client = await clientPromise;
    const db = client.db('fandf');

    // Get user
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the "fresh" status
    const freshStatus = await getStatusByValue('fresh');
    if (!freshStatus) {
      return res.status(500).json({ 
        error: 'Database not initialized. Please initialize the database first.' 
      });
    }

    // Create Easy Apply application
    const applicationsCollection = db.collection('applications');
    const application = {
      userId: user._id,
      url: normalizedUrl,
      isEasyApply: true,
      status: freshStatus._id,
      target: target.trim(),
      company_info: {
        name: companyName.trim(),
        salary: '',
        other: '',
      },
      title: title?.trim() || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await applicationsCollection.insertOne(application);
    const createdApplication = {
      ...application,
      _id: result.insertedId,
    };

    return res.status(200).json({
      success: true,
      application: {
        ...createdApplication,
        _id: result.insertedId.toString(),
      },
      message: 'Easy Apply application created successfully',
    });
  } catch (error: any) {
    console.error('Error creating Easy Apply application:', error);
    
    // Check if it's a duplicate key error on the url field
    if (error.code === 11000 && error.keyPattern?.url) {
      return res.status(500).json({
        error: 'Failed to create Easy Apply application',
        details: 'Database index conflict. Please run the migration script: npm run migrate-fix-url-index or ts-node scripts/migrate-fix-url-index.ts',
        migrationNeeded: true,
      });
    }
    
    return res.status(500).json({
      error: 'Failed to create Easy Apply application',
      details: error.message,
    });
  }
}

