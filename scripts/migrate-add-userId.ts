// Load environment variables from .env.local (Next.js style)
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

// Import MongoClient and ObjectId after environment variables are loaded
const { MongoClient, ObjectId } = require('mongodb');

async function migrate() {
  // Get MongoDB URI from environment or use default
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fandf';
  
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not found in environment, using default:', uri);
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('fandf');
    
    // Get your admin user ID from the users collection
    const usersCollection = db.collection('users');
    const adminUser = await usersCollection.findOne({ email: 'mf5114796@gmail.com' });
    
    if (!adminUser) {
      console.error('❌ Admin user not found!');
      process.exit(1);
    }
    
    const adminUserId = adminUser._id;
    console.log('✅ Found admin user:', adminUser.email);
    console.log('📋 User ID:', adminUserId);
    
    // Update all applications without userId
    const applicationsCollection = db.collection('applications');
    const applicationsResult = await applicationsCollection.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminUserId } }
    );
    console.log(`✅ Updated ${applicationsResult.modifiedCount} applications`);
    
    // Update all rejected URLs without userId
    const urlsCollection = db.collection('urls');
    const urlsResult = await urlsCollection.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminUserId } }
    );
    console.log(`✅ Updated ${urlsResult.modifiedCount} rejected URLs`);
    
    console.log('🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

migrate();

