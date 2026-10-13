// Load environment variables from .env.local (Next.js style)
// Using require() to ensure it executes before imports are processed
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try to load .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Verify MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('   Please ensure .env.local contains MONGODB_URI=...');
  process.exit(1);
}

// Now we can safely import
import { initializeDatabase } from '../lib/initDatabase';

async function main() {
  try {
    console.log('🚀 Starting database initialization...');
    const result = await initializeDatabase();
    console.log('✅ Success:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();