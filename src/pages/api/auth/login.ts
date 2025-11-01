import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// Default credentials
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_MODERATOR_EMAIL = 'moderator@example.com';
const DEFAULT_PASSWORD = 'admin123';

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

    // Check if user exists
    let user = await prisma.user.findFirst({
      where: {
        email: emailLower,
        role: role,
      },
    });

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
      user = await prisma.user.create({
        data: {
          email: emailLower,
          passwordHash: passwordHash,
          role: role,
        },
      });
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
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? String(error) : undefined });
  }
}
