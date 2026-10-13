# F&F (First and Foremost)

A comprehensive job application management system built with Next.js, TypeScript, and MongoDB.

## Overview

F&F helps streamline the job application process by:
- Tracking job applications with status management
- AI-powered resume tailoring (future implementation)
- Job description analysis
- Analytics dashboard for application metrics

## Tech Stack

- **Frontend & Backend**: Next.js 14 with TypeScript
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Document Export**: jsPDF

## Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- MongoDB installed and running locally, or a MongoDB Atlas account

## Your Approach (Setup Instructions)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MongoDB

**Option A: Local MongoDB**
- Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
- Start MongoDB service:
  - Windows: MongoDB should start automatically after installation
  - Mac: `brew services start mongodb-community`
  - Linux: `sudo systemctl start mongod`

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a new cluster
- Get your connection string
- Update the `MONGODB_URI` in `.env.local` with your Atlas connection string

### 3. Environment Variables

Create a `.env.local` file in the root directory (or update the existing one):

```env
MONGODB_URI=mongodb://localhost:27017/fandf
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000
```

**Important**: Change the `NEXTAUTH_SECRET` to a secure random string in production. You can generate one using:
```bash
openssl rand -base64 32
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Login Credentials

Use these credentials to log in:
- **Email**: mf5114796@gmail.com
- **Password**: justice123.

## Features Implemented (First Step)

### ✅ Landing Page
- Clean, modern design explaining the platform
- Call-to-action button to sign in

### ✅ Authentication System
- Secure login with NextAuth.js
- Session management
- Protected routes

### ✅ Dashboard Layout
- Expandable sidebar navigation
- Responsive design for mobile and desktop
- User avatar with logout functionality
- Three main navigation sections:
  - My Applications
  - User Management
  - Export Resume

### ✅ Dashboard Home
- Welcome message with user name
- Statistics cards showing key metrics
- Multiple charts with dummy data:
  - Applications over time (Bar chart)
  - Application status distribution (Pie chart)
  - Weekly activity (Line chart)
- Recent activity feed

### ✅ My Applications Page
- Empty table with proper structure
- Search and filter functionality UI
- "Add Application" button for future implementation

### ✅ User Management Page
- Table showing superadmin user
- User statistics (Total, Active, Admins)
- Search functionality
- Add/Edit/Delete user buttons (UI only)

### ✅ Export Resume Page
- Word-like document editor interface
- Multiple editable sections:
  - Personal Information
  - Professional Summary
  - Work Experience
  - Education
  - Skills
- Add/Remove sections dynamically
- Export to PDF functionality
- Export to DOCX (Word) functionality

## Project Structure

```
.
├── app/
│   ├── dashboard/
│   │   ├── applications/    # My Applications page
│   │   ├── users/           # User Management page
│   │   ├── export/          # Export Resume page
│   │   ├── layout.tsx       # Dashboard layout wrapper
│   │   └── page.tsx         # Dashboard home
│   ├── login/               # Login page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/
│   ├── DashboardLayout.tsx  # Sidebar and layout component
│   └── SessionProvider.tsx  # NextAuth session provider
├── lib/
│   └── mongodb.ts           # MongoDB connection
├── pages/
│   └── api/
│       └── auth/
│           └── [...nextauth].ts  # NextAuth configuration
├── types/
│   └── next-auth.d.ts       # TypeScript definitions
└── package.json
```

## Next Steps

The following features are planned for future implementation:

1. **URL Processing**: Add functionality to fetch and store job URLs
2. **AI Integration**: Connect with Claude Sonnet or ChatGPT for:
   - Job description extraction
   - Resume tailoring
   - Cover letter generation
3. **Application Management**: Full CRUD operations for job applications
4. **Export Configuration**: Configure export folder paths and naming conventions
5. **Question Bank**: Store and generate answers for common application questions
6. **Database Models**: Complete MongoDB schema implementation

## Development Notes

- The authentication currently uses a hardcoded admin user for development
- MongoDB connection is established but not yet used for data persistence (will be implemented in future steps)
- All data shown in charts and tables is currently dummy data for demonstration
- The application is fully responsive and works on mobile, tablet, and desktop

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check if the port 27017 is available
- Verify the connection string in `.env.local`

### NextAuth Errors
- Make sure `NEXTAUTH_SECRET` is set in `.env.local`
- Verify `NEXTAUTH_URL` matches your development URL

### Build Errors
- Delete `.next` folder and `node_modules`, then run `npm install` again
- Check Node.js version (requires 18+)

## License

Private project for personal use.

