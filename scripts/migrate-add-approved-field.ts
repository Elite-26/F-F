import { MongoClient } from 'mongodb';

/**
 * Migration script to add the 'approved' field to existing users
 * - Admin users: approved = true
 * - Regular users: approved = false (pending approval)
 */
async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fandf';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('fandf');
    const usersCollection = db.collection('users');

    // Find all users without the 'approved' field
    const usersWithoutApproved = await usersCollection.find({
      approved: { $exists: false },
    }).toArray();

    if (usersWithoutApproved.length === 0) {
      console.log('✅ All users already have the approved field');
      return;
    }

    console.log(`📋 Found ${usersWithoutApproved.length} users without approved field`);

    // Update each user
    for (const user of usersWithoutApproved) {
      const approved = user.role === 'admin'; // Admins are auto-approved
      
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            approved,
            updatedAt: new Date(),
          } 
        }
      );

      console.log(`✅ Updated user: ${user.email} (approved: ${approved})`);
    }

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

