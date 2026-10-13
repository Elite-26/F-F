import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { Status } from '../../../types/models';
import { ensureAllStatusesExist, getStatusByValue } from '../../../lib/initDatabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application ID format' });
    }

    await ensureAllStatusesExist();

    const client = await clientPromise;
    const db = client.db('fandf');
    const statusesCollection = db.collection<Status>('statuses');

    const userEmail = session.user.email;
    const user = await db.collection('users').findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get single application
      const application = await db.collection('applications').findOne({
        _id: new ObjectId(id),
        userId: user._id,
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Get status information
      const status = await statusesCollection.findOne({
        _id: application.status,
      });

      // Get all statuses for status progression
      const allStatuses = await statusesCollection
        .find({})
        .sort({ order: 1 })
        .toArray();

      return res.status(200).json({
        application: {
          ...application,
          _id: application._id.toString(),
          statusValue: status?.value || 'unknown',
          statusOrder: status?.order || 0,
          statusDescription: status?.description || '',
        },
        allStatuses: allStatuses.map((s) => ({
          _id: s._id.toString(),
          order: s.order,
          value: s.value,
          description: s.description,
        })),
      });
    } else if (req.method === 'PUT') {
      // Update application
      const updates = req.body;

      // Remove fields that shouldn't be directly updated
      delete updates._id;
      delete updates.userId;
      delete updates.createdAt;

      if ('bidFailedReason' in updates) {
        if (typeof updates.bidFailedReason === 'string') {
          const trimmedReason = updates.bidFailedReason.trim();
          updates.bidFailedReason = trimmedReason || null;
        } else if (updates.bidFailedReason === null) {
          updates.bidFailedReason = null;
        } else {
          delete updates.bidFailedReason;
        }
      }

      if ('comment' in updates) {
        if (typeof updates.comment === 'string') {
          const trimmedComment = updates.comment.trim();
          updates.comment = trimmedComment || null;
        } else if (updates.comment === null) {
          updates.comment = null;
        } else {
          delete updates.comment;
        }
      }

      // If status is being updated and it's a string (status value), convert it to ObjectId
      if (updates.status && typeof updates.status === 'string') {
        const newStatus = await getStatusByValue(updates.status);

        if (newStatus) {
          // Set appliedAt when status changes to 'applied'
          if (newStatus.value === 'applied') {
            // Check if appliedAt is not already set
            const currentApp = await db.collection('applications').findOne({
              _id: new ObjectId(id),
              userId: user._id,
            });
            if (currentApp && !currentApp.appliedAt) {
              updates.appliedAt = new Date();
            }
          }
          
          if (newStatus.value === 'bid_failed') {
            updates.bidFailedAt = new Date();
          }

          updates.status = newStatus._id;
        } else {
          delete updates.status;
        }
      }

      // Add updatedAt timestamp
      updates.updatedAt = new Date();

      const result = await db.collection('applications').updateOne(
        { _id: new ObjectId(id), userId: user._id },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Fetch the updated application
      const updatedApplication = await db.collection('applications').findOne({
        _id: new ObjectId(id),
      });

      // Get status information
      const status = await statusesCollection.findOne({
        _id: updatedApplication?.status,
      });

      return res.status(200).json({
        success: true,
        application: {
          ...updatedApplication,
          _id: updatedApplication?._id.toString(),
          statusValue: status?.value || 'unknown',
          statusOrder: status?.order || 0,
          statusDescription: status?.description || '',
        },
      });
    } else if (req.method === 'DELETE') {
      // Fetch application first to capture export folder path
      const application = await db.collection('applications').findOne({
        _id: new ObjectId(id),
        userId: user._id,
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found or unauthorized' });
      }

      let folderDeleted = false;

      if (application.export_location && typeof application.export_location === 'string') {
        const normalizedExportPath = path.normalize(application.export_location);
        const folderExists = fs.existsSync(normalizedExportPath);

        if (folderExists) {
          try {
            fs.rmSync(normalizedExportPath, { recursive: true, force: true });
            folderDeleted = true;
          } catch (folderErr: any) {
            console.error('Failed to delete export folder:', folderErr);
            return res.status(500).json({
              error: 'Failed to delete export folder. Please close files inside the folder and try again.',
              details: folderErr.message || 'Unknown error while deleting folder',
            });
          }
        }
      }

      const result = await db.collection('applications').deleteOne({
        _id: new ObjectId(id),
        userId: user._id,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Application not found or unauthorized' });
      }

      return res.status(200).json({
        success: true,
        message: 'Application deleted successfully',
        folderDeleted,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error in applications/[id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

