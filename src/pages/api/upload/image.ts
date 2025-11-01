import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { uploadToR2 } from '@/lib/r2';

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
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB max file size
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(400).json({ error: 'Failed to parse form data' });
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Get folder from query or fields, default to 'products'
      const folder = (req.query.folder as unknown as string) || (fields.folder as unknown as string) || 'products';

      try {
        // Read file buffer
        const fileBuffer = fs.readFileSync(file.filepath);
        const fileName = file.originalFilename || file.newFilename || 'image.jpg';

        // Upload to R2
        const result = await uploadToR2(fileBuffer, fileName, folder as string);

        // Clean up temporary file
        fs.unlinkSync(file.filepath);

        return res.status(200).json({
          success: true,
          url: result.url,
          key: result.key,
        });
      } catch (uploadError) {
        console.error('R2 upload error:', uploadError);
        // Clean up temporary file on error
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        return res.status(500).json({ error: 'Failed to upload image', details: String(uploadError) });
      }
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}

