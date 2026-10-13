import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fandf';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('fandf');
    const usersCollection = db.collection('users');

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ 
      email: 'mf5114796@gmail.com' 
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      return;
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync('justice123.', 10);

    // Create admin user - now type-checked!
    const newUser = {
      email: 'mf5114796@gmail.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'admin',
      approved: true, // Admin is automatically approved
      createdAt: new Date(),
    };
    
    const result = await usersCollection.insertOne(newUser);

    console.log('Admin user created successfully!');
    console.log('Email: mf5114796@gmail.com');
    console.log('Password: justice123.');
    console.log('User ID:', result.insertedId);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAdminUser();

