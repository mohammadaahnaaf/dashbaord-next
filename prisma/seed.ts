import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file');
  console.error('Please create a .env file with DATABASE_URL=postgresql://...');
  process.exit(1);
}

// Fix DATABASE_URL if it has quotes (common issue with .env files)
const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && (dbUrl.startsWith('"') || dbUrl.startsWith("'"))) {
  process.env.DATABASE_URL = dbUrl.replace(/^["']|["']$/g, '');
}

const prisma = new PrismaClient();

async function main() {
  const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
  const DEFAULT_MODERATOR_EMAIL = 'moderator@example.com';
  const DEFAULT_PASSWORD = 'admin123';

  // Hash passwords
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      passwordHash: hashedPassword,
      role: 'admin',
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin user created/updated:', admin.email);

  // Create or update moderator user
  const moderator = await prisma.user.upsert({
    where: { email: DEFAULT_MODERATOR_EMAIL },
    update: {
      passwordHash: hashedPassword,
      role: 'moderator',
    },
    create: {
      email: DEFAULT_MODERATOR_EMAIL,
      passwordHash: hashedPassword,
      role: 'moderator',
    },
  });

  console.log('✅ Moderator user created/updated:', moderator.email);

  console.log('\n📝 Default credentials:');
  console.log(`Admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_PASSWORD}`);
  console.log(`Moderator: ${DEFAULT_MODERATOR_EMAIL} / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

