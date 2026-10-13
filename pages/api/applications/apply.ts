import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { applicationId } = req.body || {};

    if (!applicationId || typeof applicationId !== 'string') {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    if (!ObjectId.isValid(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID format' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');

    const user = await db.collection('users').findOne({ email: session.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const application = await db.collection('applications').findOne({
      _id: new ObjectId(applicationId),
      userId: user._id,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const currentStatus = await db.collection('statuses').findOne({
      _id: application.status,
    });

    if (!currentStatus || currentStatus.value !== 'rsm_exported') {
      return res.status(400).json({ error: 'Application is not ready to be marked as applied' });
    }

    const appliedStatus = await db.collection('statuses').findOne({
      value: 'applied',
    });

    if (!appliedStatus) {
      return res.status(500).json({ error: 'Applied status is not configured' });
    }

    if (!application.export_location || typeof application.export_location !== 'string') {
      return res.status(400).json({ error: 'Export location is missing for this application' });
    }

    const normalizedExportPath = path.normalize(application.export_location);

    if (!fs.existsSync(normalizedExportPath)) {
      return res.status(404).json({
        error: 'Export folder not found',
        path: normalizedExportPath,
      });
    }

    const suffix = '__(•••)';
    let originalFolderName = path.basename(normalizedExportPath);
    const parentDirectory = path.dirname(normalizedExportPath);
    const alreadyApplied = originalFolderName.toLowerCase().endsWith(suffix.toLowerCase());
    const targetFolderName = alreadyApplied ? originalFolderName : `${originalFolderName}${suffix}`;
    const targetPath =
      parentDirectory === '.' || parentDirectory === ''
        ? targetFolderName
        : path.join(parentDirectory, targetFolderName);

    let renamed = false;
    if (!alreadyApplied) {
      if (fs.existsSync(targetPath)) {
        return res.status(409).json({
          error: 'Target folder already exists',
          path: targetPath,
        });
      }

      fs.renameSync(normalizedExportPath, targetPath);
      renamed = true;
    }

    const updateDoc: any = {
      status: appliedStatus._id,
      updatedAt: new Date(),
      export_location: targetPath,
    };

    if (!application.appliedAt) {
      updateDoc.appliedAt = new Date();
    }

    await db.collection('applications').updateOne(
      { _id: new ObjectId(applicationId), userId: user._id },
      { $set: updateDoc }
    );

    const updatedApplication = await db.collection('applications').findOne({
      _id: new ObjectId(applicationId),
    });

    return res.status(200).json({
      success: true,
      message: renamed
        ? 'Folder renamed and application marked as applied'
        : 'Application marked as applied',
      application: {
        ...updatedApplication,
        _id: updatedApplication?._id.toString(),
        statusValue: appliedStatus.value,
        statusOrder: appliedStatus.order,
        statusDescription: appliedStatus.description,
      },
    });
  } catch (error: any) {
    console.error('Error marking application as applied:', error);
    return res.status(500).json({
      error: 'Failed to mark application as applied',
      details: error.message,
    });
  }
}


