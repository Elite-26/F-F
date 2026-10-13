import { ObjectId } from 'mongodb';

// User document in MongoDB
export interface User {
  _id: ObjectId;
  email: string;
  password: string; // hashed password
  name: string;
  role: 'admin' | 'user'; // Add more roles as needed
  approved: boolean; // User can only login after admin approval
  resumeTemplate?: 'template_1' | 'template_2';
  /** option_1 = company/location from Options (static); option_2 = from tailored Company:/Location: lines */
  experienceOption?: 'option_1' | 'option_2';
  createdAt: Date;
  updatedAt?: Date;
}

// When creating a new user (without _id)
export interface CreateUserInput {
  email: string;
  password: string; // will be hashed
  name: string;
  role: 'admin' | 'user';
  approved?: boolean; // Defaults to false for new registrations
}

// User without sensitive data (for API responses)
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  approved: boolean;
  resumeTemplate: 'template_1' | 'template_2';
  experienceOption: 'option_1' | 'option_2';
  createdAt: Date;
}

// Status document in MongoDB
export interface Status {
  _id: ObjectId;
  order: number;
  value: string;
  description: string;
}

// Application document in MongoDB
export interface Application {
  _id: ObjectId;
  userId: ObjectId; // Reference to User collection - for multi-user isolation
  url: string;
  isEasyApply?: boolean;
  status: ObjectId; // Reference to Status collection
  target?: string; // Job target (e.g., "AI job in US", "Full Stack job in UK")
  company_info?: {
    name?: string;
    salary?: string;
    other?: string;
  };
  title?: string;
  raw_jd?: string;
  analyze_result?: {
    stack?: string[];
    mindset?: string;
    ownership?: string;
    environment?: string;
    responsibility?: string[];
  };
  tailored_summary?: string;
  tailored_result1?: string[]; // for resume's most recent experience, first element will be the title of the experience, each element represents a bullet in the experience
  tailored_result2?: string[]; 
  tailored_result3?: string[];
  tailored_certifications?: string[];
  cover_letter?: string[]; // for cover letter, each element is one paragraph
  export_location?: string; // where the resume is exported to
  createdAt: Date;
  appliedAt?: Date; // when the application is applied
  bidFailedAt?: Date; // when the application is bid failed
  bidFailedReason?: string; // optional reason when bid failed
  ongoingAt?: Date; // when the application is ongoing
  failedAt?: Date; // when the application is failed
  offerAt?: Date; // when the application is offer
  comment?: string; // user comment that can be updated at any status
  updatedAt?: Date;
}

// When creating a new application (without _id)
export interface CreateApplicationInput {
  userId: ObjectId; // Reference to User collection
  url: string;
  isEasyApply?: boolean;
  status: ObjectId;
  target?: string; // Job target (e.g., "AI job in US", "Full Stack job in UK")
  company_info?: {
    name?: string;
    salary?: string;
    other?: string;
  };
  title?: string;
  raw_jd?: string;
  analyze_result?: {
    stack?: string[];
    mindset?: string;
    ownership?: string;
    environment?: string;
    responsibility?: string[];
  };
  tailored_summary?: string; // Summary after JD analysis, before tailoring
  tailored_result1?: string[];
  tailored_result2?: string[];
  tailored_result3?: string[];
  tailored_certifications?: string[];
  cover_letter?: string[];
  comment?: string; // user comment that can be updated at any status
}

// Rejected URL document in MongoDB
export interface RejectedUrl {
  _id: ObjectId;
  userId: ObjectId; // Reference to User collection - for multi-user isolation
  value: string;
  tag: string;
  createdAt: Date;
}

// Resume configuration for a job target
export interface ResumeConfig {
  header: string[]; // [name, title, contact]
  experience_static: string[]; // [company1, location1, dateRange1, company2, location2, dateRange2, ...]
  certifications: string[]; // Array of certification strings
  education: string[][]; // Array of [university, degree, dateRange] entries
}

// Cover letter configuration for a job target
export interface CoverLetterConfig {
  header: string[]; // [name, contact]
  footer: string[]; // [closing, signature]
}

// Job Target with export folder and configurations
export interface JobTargetConfig {
  name: string; // e.g., "AI job in US"
  exportFolder: string; // e.g., "C:\Resumes\AI_US"
  resumeConfig?: ResumeConfig; // Resume configuration for this job target
  coverLetterConfig?: CoverLetterConfig; // Cover letter configuration for this job target
}

// UserOptions document in MongoDB
export interface UserOptions {
  _id: ObjectId;
  userId: ObjectId; // Reference to User collection
  jobTargets: JobTargetConfig[]; // List of job targets with their export folders and configurations
  createdAt: Date;
  updatedAt?: Date;
}

// Interview document in MongoDB
export interface Interview {
  _id: ObjectId;
  applicationId: ObjectId; // Reference to Application collection
  userId: ObjectId; // Reference to User collection
  date: Date; // Interview date
  interviewers?: string; // Interviewer names
  type: 'phone' | 'agency' | 'HR' | 'tech_qa' | 'live_coding' | 'system_design' | 'tech_discuss' | 'culture'; // Interview type
  savedVideoLocation?: string; // Path to saved video
  feedback?: string; // Feedback from interview
  content?: string; // Interview content/notes
  duration?: number; // Duration in minutes
  createdAt: Date;
  updatedAt?: Date;
}

