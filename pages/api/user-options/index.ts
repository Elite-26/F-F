import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { UserOptions } from '../../../types/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');

    // Get the user's ObjectId from email
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user._id;

    if (req.method === 'GET') {
      // Get user options
      const optionsCollection = db.collection<UserOptions>('user_options');
      let options = await optionsCollection.findOne({ userId });

      // If options don't exist, create default options
      if (!options) {
        const defaultOptions: Omit<UserOptions, '_id'> = {
          userId,
          jobTargets: [],
          createdAt: new Date(),
        };
        const result = await optionsCollection.insertOne(defaultOptions as any);
        options = await optionsCollection.findOne({ _id: result.insertedId });
      }

      return res.status(200).json({
        success: true,
        options: {
          _id: options?._id.toString(),
          userId: options?.userId.toString(),
          jobTargets: options?.jobTargets || [],
          createdAt: options?.createdAt,
          updatedAt: options?.updatedAt,
        },
      });
    } else if (req.method === 'PUT') {
      // Update user options
      const { jobTargets } = req.body;

      console.log('PUT /api/user-options - Received jobTargets:', JSON.stringify(jobTargets, null, 2));

      const optionsCollection = db.collection<UserOptions>('user_options');
      
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (jobTargets !== undefined) {
        if (!Array.isArray(jobTargets)) {
          console.error('jobTargets is not an array:', typeof jobTargets);
          return res.status(400).json({ error: 'jobTargets must be an array' });
        }
        // Validate structure
        for (const target of jobTargets) {
          if (!target.name || typeof target.name !== 'string') {
            console.error('Invalid job target - missing name:', target);
            return res.status(400).json({ error: 'Each job target must have a name' });
          }
          if (!target.exportFolder || typeof target.exportFolder !== 'string') {
            console.error('Invalid job target - missing exportFolder:', target);
            return res.status(400).json({ error: 'Each job target must have an exportFolder' });
          }
        }
        updateData.jobTargets = jobTargets;
      }

      console.log('Updating with data:', JSON.stringify(updateData, null, 2));

      const result = await optionsCollection.findOneAndUpdate(
        { userId },
        { 
          $set: updateData,
          $setOnInsert: {
            userId,
            createdAt: new Date(),
          }
        },
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );

      console.log('Update result:', result);

      if (!result) {
        console.error('No result from findOneAndUpdate');
        return res.status(500).json({ error: 'Failed to update options - no result' });
      }

      // MongoDB driver returns the document directly in some versions
      const updatedDoc = result.value || result;
      
      if (!updatedDoc) {
        console.error('No document in result');
        return res.status(500).json({ error: 'Failed to update options - no document' });
      }

      console.log('Successfully updated options:', updatedDoc);

      return res.status(200).json({
        success: true,
        options: {
          _id: updatedDoc._id.toString(),
          userId: updatedDoc.userId.toString(),
          jobTargets: updatedDoc.jobTargets || [],
          createdAt: updatedDoc.createdAt,
          updatedAt: updatedDoc.updatedAt,
        },
        message: 'Options updated successfully',
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling user options:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

