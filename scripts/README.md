# Scripts

This directory contains utility scripts for the FandF application.

## create-admin.ts

Creates an admin user in the MongoDB database with a securely hashed password.

### Usage

1. Make sure MongoDB is running:
   ```bash
   cd "MongoDB Setup"
   docker-compose up -d
   ```

2. Make sure you have created `.env.local` with your MongoDB connection string:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/fandf
   ```

3. Install dependencies if you haven't already:
   ```bash
   npm install
   ```

4. Run the script:
   ```bash
   npm run create-admin
   ```

This will create an admin user with:
- **Email**: mf5114796@gmail.com
- **Password**: justice123.
- **Role**: admin

> ⚠️ **Security Note**: Change the default password after first login! You can modify the email and password in the script before running it.

### Customizing Admin Credentials

To create an admin with different credentials, edit `scripts/create-admin.ts` and change the values:

```typescript
const existingAdmin = await usersCollection.findOne({ 
  email: 'your-email@example.com'  // Change this
});

const hashedPassword = bcrypt.hashSync('your-secure-password', 10);  // Change this

await usersCollection.insertOne({
  email: 'your-email@example.com',  // Change this
  password: hashedPassword,
  name: 'Your Name',  // Change this
  role: 'admin',
  createdAt: new Date(),
});
```

Then run `npm run create-admin` again.

