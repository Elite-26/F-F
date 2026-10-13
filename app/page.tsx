'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { Briefcase, Target, FileText, BarChart } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-indigo-900 mb-4">
            F&F
          </h1>
          <p className="text-2xl text-indigo-700 mb-2">First and Foremost</p>
          <p className="text-lg text-gray-600">
            Your job application is first and foremost to acquire the job
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12 mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
            Streamline Your Job Application Process
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 text-center">
            F&F is a comprehensive platform designed to help you manage and optimize your job applications. 
            Tailor your resume, track applications, and increase your chances of landing your dream job.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="flex items-start space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Smart Application Tracking</h3>
                <p className="text-gray-600 text-sm">
                  Track all your job applications in one place with status management
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">AI-Powered Resume Tailoring</h3>
                <p className="text-gray-600 text-sm">
                  Generate customized resumes and cover letters for each application
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Job Description Analysis</h3>
                <p className="text-gray-600 text-sm">
                  Automatically extract and analyze job requirements from URLs
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <BarChart className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600 text-sm">
                  Visualize your application progress and success metrics
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600">
          <p>© 2025 F&F - First and Foremost. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

