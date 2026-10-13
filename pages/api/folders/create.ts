import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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

    const { folderPath } = req.body;

    if (!folderPath || typeof folderPath !== 'string') {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    // Normalize path - convert forward slashes to backslashes on Windows, or use path.join
    const normalizedPath = path.normalize(folderPath);

    // Check if folder already exists
    if (fs.existsSync(normalizedPath)) {
      return res.status(200).json({
        success: true,
        message: 'Folder already exists',
        path: normalizedPath,
        alreadyExists: true,
      });
    }

    // Create folder (including parent directories if needed)
    fs.mkdirSync(normalizedPath, { recursive: true });

    return res.status(200).json({
      success: true,
      message: 'Folder created successfully',
      path: normalizedPath,
      alreadyExists: false,
    });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    return res.status(500).json({
      error: 'Failed to create folder',
      details: error.message,
    });
  }
}

