import clientPromise from './mongodb';
import { Status } from '../types/models';

const initialStatuses: Omit<Status, '_id'>[] = [
  { order: 1, value: 'fresh', description: 'URL freshly imported, not yet processed' },
  { order: 2, value: 'jd_fetched', description: 'Job description has been fetched from the URL' },
  { order: 3, value: 'jd_analyzed', description: 'Job description has been analyzed by AI' },
  { order: 4, value: 'tailored', description: 'Resume has been tailored for this job' },
  { order: 5, value: 'rsm_exported', description: 'Resume has been exported' },
  { order: 6, value: 'applied', description: 'Application has been submitted' },
  { order: 7, value: 'bid_failed', description: 'Bid/application failed or rejected' },
  { order: 8, value: 'ongoing', description: 'Application is under review' },
  { order: 9, value: 'failed', description: 'Application was unsuccessful' },
  { order: 10, value: 'offer', description: 'Offer received' },
  { order: 11, value: 'no_interest', description: 'User is no longer interested in this application' },
];

export async function initializeDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log('🔄 Initializing database...');

    // Check if statuses collection exists and has data
    const statusesCollection = db.collection<Omit<Status, '_id'>>('statuses');
    const existingCount = await statusesCollection.countDocuments();

    if (existingCount > 0) {
      console.log('✅ Statuses already initialized. Skipping...');
      return {
        success: true,
        message: 'Database already initialized',
        statusesCount: existingCount,
      };
    }

    // Insert initial statuses
    const result = await statusesCollection.insertMany(initialStatuses);
    console.log(`✅ Inserted ${result.insertedCount} statuses`);

    // Create indexes
    await statusesCollection.createIndex({ value: 1 }, { unique: true });
    await statusesCollection.createIndex({ order: 1 });
    console.log('✅ Created indexes for statuses collection');

    // Create indexes for applications collection
    const applicationsCollection = db.collection('applications');
    // Compound index for user-specific URL uniqueness (each user can have their own set of URLs)
    // Partial index: only enforce uniqueness when url is not empty (allows multiple Easy Apply applications)
    // Using $gt: '' instead of $ne: '' because MongoDB doesn't support $ne in partial indexes
    await applicationsCollection.createIndex(
      { userId: 1, url: 1 }, 
      { 
        unique: true,
        partialFilterExpression: { url: { $gt: '' } }
      }
    );
    // Index for filtering by user and status
    await applicationsCollection.createIndex({ userId: 1, status: 1 });
    // Index for user-specific date sorting
    await applicationsCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✅ Created indexes for applications collection');

    // Create indexes for rejected URLs collection
    const rejectedUrlsCollection = db.collection('urls');
    await rejectedUrlsCollection.createIndex({ userId: 1, value: 1 });
    await rejectedUrlsCollection.createIndex({ userId: 1, tag: 1 });
    await rejectedUrlsCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✅ Created indexes for urls collection');

    console.log('✅ Database initialization complete!');

    return {
      success: true,
      message: 'Database initialized successfully',
      statusesCount: result.insertedCount,
    };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Helper function to get status by value
export async function getStatusByValue(value: string) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const statusesCollection = db.collection<Status>('statuses');
    
    let status = await statusesCollection.findOne({ value });

    if (!status) {
      const template = initialStatuses.find((s) => s.value === value);
      if (template) {
        const insertResult = await statusesCollection.insertOne(template);
        status = await statusesCollection.findOne({ _id: insertResult.insertedId });
      }
    }

    return status;
  } catch (error) {
    console.error('Error getting status:', error);
    throw error;
  }
}

export async function ensureAllStatusesExist() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const statusesCollection = db.collection<Status>('statuses');

    await Promise.all(
      initialStatuses.map((status) =>
        statusesCollection.updateOne(
          { value: status.value },
          { $set: status },
          { upsert: true }
        )
      )
    );
  } catch (error) {
    console.error('Error ensuring statuses exist:', error);
    throw error;
  }
}

// Helper function to get all statuses
export async function getAllStatuses() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const statusesCollection = db.collection<Status>('statuses');
    
    const statuses = await statusesCollection.find().sort({ order: 1 }).toArray();
    return statuses;
  } catch (error) {
    console.error('Error getting statuses:', error);
    throw error;
  }
}

