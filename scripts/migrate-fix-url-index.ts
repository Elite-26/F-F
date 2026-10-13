// Make this file a module to avoid redeclaration errors
export {};

// Load environment variables from .env.local (Next.js style)
const dotenvLib = require('dotenv');
const pathLib = require('path');
const fsLib = require('fs');

// Try to load .env.local first, then .env
const envLocalPath = pathLib.resolve(process.cwd(), '.env.local');
const envPath = pathLib.resolve(process.cwd(), '.env');

if (fsLib.existsSync(envLocalPath)) {
  const result = dotenvLib.config({ path: envLocalPath });
  if (result.error) {
    console.warn('⚠️  Warning: Error loading .env.local:', result.error.message);
  } else {
    console.log('✅ Loaded environment variables from .env.local');
  }
} else if (fsLib.existsSync(envPath)) {
  const result = dotenvLib.config({ path: envPath });
  if (result.error) {
    console.warn('⚠️  Warning: Error loading .env:', result.error.message);
  } else {
    console.log('✅ Loaded environment variables from .env');
  }
} else {
  console.warn('⚠️  Warning: No .env.local or .env file found');
}

// Import MongoClient after environment variables are loaded
const { MongoClient } = require('mongodb');

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
    
    console.log('🔄 Starting migration to fix applications URL index...');
    
    const applicationsCollection = db.collection('applications');
    
    // Get all existing indexes
    const indexes = await applicationsCollection.indexes();
    console.log('📋 Current indexes:', indexes.map((idx: any) => idx.name));
    
    // Find indexes that might conflict: userId_1_url_1 or url_1 (if it's unique)
    const oldIndexName = 'userId_1_url_1';
    const urlIndexName = 'url_1';
    const oldIndex = indexes.find((idx: any) => idx.name === oldIndexName);
    const urlIndex = indexes.find((idx: any) => idx.name === urlIndexName);
    
    // First, check and drop the old url_1 index if it exists and is unique
    // This must be done before checking userId_1_url_1 to avoid conflicts
    if (urlIndex && urlIndex.unique) {
      console.log(`⚠️  Found unique index on url: ${urlIndexName}`);
      console.log('   Dropping it to allow multiple Easy Apply applications...');
      try {
        await applicationsCollection.dropIndex(urlIndexName);
        console.log('✅ Old url_1 index dropped');
      } catch (error: any) {
        if (error.code === 27 || error.codeName === 'IndexNotFound') {
          console.log('ℹ️  Index not found');
        } else {
          console.error('❌ Error dropping url_1 index:', error.message);
          throw error;
        }
      }
    }
    
    // Check if the correct index already exists
    if (oldIndex) {
      // Check if it's already a partial index with the correct filter
      if (oldIndex.partialFilterExpression && 
          oldIndex.partialFilterExpression.url && 
          oldIndex.partialFilterExpression.url.$gt === '') {
        console.log('✅ Index is already a partial index with correct configuration.');
        // Still check if url_1 was dropped, if not, we're done
        if (!urlIndex || !urlIndex.unique) {
          console.log('✅ No migration needed.');
          process.exit(0);
        }
      } else {
        console.log(`🗑️  Dropping old index: ${oldIndexName}`);
        try {
          await applicationsCollection.dropIndex(oldIndexName);
          console.log('✅ Old index dropped');
        } catch (error: any) {
          if (error.code === 27 || error.codeName === 'IndexNotFound') {
            console.log('ℹ️  Index not found, will create new one');
          } else {
            throw error;
          }
        }
      }
    }
    
    // Create new partial index that only enforces uniqueness when url is not empty
    // Using $gt: '' instead of $ne: '' because MongoDB doesn't support $ne in partial indexes
    // $gt: '' matches any non-empty string
    console.log('🔨 Creating new partial index...');
    try {
      await applicationsCollection.createIndex(
        { userId: 1, url: 1 }, 
        { 
          unique: true,
          partialFilterExpression: { url: { $gt: '' } },
          name: 'userId_1_url_1'
        }
      );
      console.log('✅ New partial index created');
    } catch (error: any) {
      // Index might already exist
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Index already exists with correct configuration');
      } else if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
        console.log('ℹ️  Index with same key pattern already exists');
        // Try to drop and recreate
        try {
          await applicationsCollection.dropIndex('userId_1_url_1');
          await applicationsCollection.createIndex(
            { userId: 1, url: 1 }, 
            { 
              unique: true,
              partialFilterExpression: { url: { $gt: '' } },
              name: 'userId_1_url_1'
            }
          );
          console.log('✅ Index recreated with correct configuration');
        } catch (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }
    
    // Verify the new index
    const newIndexes = await applicationsCollection.indexes();
    const newIndex = newIndexes.find((idx: any) => idx.name === 'userId_1_url_1');
    if (newIndex) {
      console.log('✅ Index verification:', {
        name: newIndex.name,
        unique: newIndex.unique,
        partialFilterExpression: newIndex.partialFilterExpression
      });
      // Verify the filter expression is correct
      if (newIndex.partialFilterExpression?.url?.$gt === '') {
        console.log('✅ Partial filter expression is correct (url > "")');
      }
    }
    
    console.log('🎉 Migration complete!');
    console.log('📝 Note: The index now only enforces uniqueness for non-empty URLs.');
    console.log('   This allows multiple Easy Apply applications (with empty URLs) per user.');
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

