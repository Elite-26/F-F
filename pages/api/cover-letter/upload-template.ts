import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { IncomingMessage } from 'http';

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
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

    if (!session || !session.user || !session.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    // Create user-specific directory for cover letter templates
    const uploadsDir = path.join(process.cwd(), 'uploads', 'cover-letters', userId);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse the form data
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req as unknown as IncomingMessage);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedExtensions = ['.docx', '.doc'];
    const fileExt = path.extname(file.originalFilename || file.newFilename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      // Delete the uploaded file if it's not the right type
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(400).json({ error: 'Invalid file type. Please upload a .docx or .doc file' });
    }

    // Rename file to a standard name (template.docx)
    const finalPath = path.join(uploadsDir, 'template.docx');
    
    // If a template already exists, remove it
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }

    // Move/rename the uploaded file
    fs.renameSync(file.filepath, finalPath);

    return res.status(200).json({
      success: true,
      message: 'Template uploaded successfully',
      filePath: finalPath,
      fileName: 'template.docx',
    });
  } catch (error: any) {
    console.error('Error uploading template:', error);
    return res.status(500).json({
      error: 'Failed to upload template',
      details: error.message,
    });
  }
}

