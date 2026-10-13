import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Connection status tracking
let isConnectionTested = false;

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
    
    // Log connection attempt
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 MongoDB URI:', uri.replace(/\/\/.*:.*@/, '//****:****@')); // Hide credentials if any
    
    globalWithMongo._mongoClientPromise
      .then(() => {
        console.log('✅ MongoDB connected successfully!');
        console.log('🗄️  Database ready for operations');
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed!');
        console.error('Error details:', error.message);
        console.error('Make sure MongoDB is running with: docker start fandf-mongodb');
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  
  // Log connection attempt for production
  console.log('🔄 Attempting to connect to MongoDB (production)...');
  clientPromise
    .then(() => {
      console.log('✅ MongoDB connected successfully!');
    })
    .catch((error) => {
      console.error('❌ MongoDB connection failed!');
      console.error('Error details:', error.message);
    });
}

// Function to test MongoDB connection
export async function testConnection(): Promise<boolean> {
  if (isConnectionTested) {
    return true;
  }

  try {
    console.log('🔍 Testing MongoDB connection...');
    const client = await clientPromise;
    const db = client.db();
    
    // Ping the database
    await db.admin().ping();
    
    console.log('✅ MongoDB connection test successful!');
    console.log('📊 Database name:', db.databaseName);
    
    // List collections (optional)
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections found:', collections.map(c => c.name).join(', ') || 'No collections yet');
    
    isConnectionTested = true;
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection test failed!');
    console.error('Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

export default clientPromise;

