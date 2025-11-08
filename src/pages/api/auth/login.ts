import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// Default credentials
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_MODERATOR_EMAIL = 'moderator@example.com';
const DEFAULT_PASSWORD = 'admin123';

// Helper function to retry database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection pool timeout error
      if (error?.message?.includes('connection pool') || 
          error?.message?.includes('Timed out')) {
        console.warn(`Database connection attempt ${attempt} failed, retrying...`);
        
        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          continue;
        }
      }
      
      // If it's not a connection error or we're out of retries, throw
      throw error;
    }
  }
  
  throw lastError;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!role || (role !== 'admin' && role !== 'moderator')) {
      return res.status(400).json({ error: 'Valid role (admin or moderator) is required' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user exists with retry logic
    let user = await withRetry(() => 
      prisma.user.findFirst({
        where: {
          email: emailLower,
          role: role,
        },
      })
    );

    if (!user) {
      // Check if it's a default user trying to login
      const isDefaultAdmin = emailLower === DEFAULT_ADMIN_EMAIL && role === 'admin';
      const isDefaultModerator = emailLower === DEFAULT_MODERATOR_EMAIL && role === 'moderator';
      
      if (!isDefaultAdmin && !isDefaultModerator) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify default password
      if (password !== DEFAULT_PASSWORD) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Create default user with hashed password
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      user = await withRetry(() =>
        prisma.user.create({
          data: {
            email: emailLower,
            passwordHash: passwordHash,
            role: role,
          },
        })
      );
    } else {
      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Set HTTP-only cookie for session (optional, for additional security)
    res.setHeader('Set-Cookie', `userRole=${role}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Better error handling for connection issues
    if (error?.message?.includes('connection pool') || 
        error?.message?.includes('Timed out')) {
      return res.status(503).json({ 
        error: 'Database connection error. Please try again in a moment.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    });
  }
}
