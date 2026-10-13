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

    const { oldPath, newPath } = req.body;

    if (!oldPath || typeof oldPath !== 'string') {
      return res.status(400).json({ error: 'Old path is required' });
    }

    if (!newPath || typeof newPath !== 'string') {
      return res.status(400).json({ error: 'New path is required' });
    }

    // Normalize paths using path.normalize to handle both / and \ separators correctly
    const normalizedOldPath = path.normalize(oldPath);
    const normalizedNewPath = path.normalize(newPath);

    // Check if old folder exists
    if (!fs.existsSync(normalizedOldPath)) {
      // Try to find if the folder exists with different path separators
      const altPath = oldPath.replace(/\\/g, '/').replace(/\//g, path.sep === '\\' ? '\\' : '/');
      const normalizedAltPath = path.normalize(altPath);
      
      return res.status(404).json({
        error: 'Source folder not found',
        path: normalizedOldPath,
        originalPath: oldPath,
        suggestion: 'The folder may not exist or the path may be incorrect. Please verify the export location.',
      });
    }

    // Check if new path already exists
    if (fs.existsSync(normalizedNewPath)) {
      return res.status(409).json({
        error: 'Destination folder already exists',
        path: normalizedNewPath,
        originalPath: newPath,
      });
    }

    // Rename (move) the folder
    fs.renameSync(normalizedOldPath, normalizedNewPath);

    return res.status(200).json({
      success: true,
      message: 'Folder renamed successfully',
      oldPath: normalizedOldPath,
      newPath: normalizedNewPath,
    });
  } catch (error: any) {
    console.error('Error renaming folder:', error);
    return res.status(500).json({
      error: 'Failed to rename folder',
      details: error.message,
    });
  }
}

