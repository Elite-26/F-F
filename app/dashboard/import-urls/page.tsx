'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Database, Trash2 } from 'lucide-react';

interface ImportResult {
  success: boolean;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  message: string;
  details?: {
    valid: string[];
    duplicates: string[];
    invalid: string[];
  };
}

export default function ImportUrlsPage() {
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initMessage, setInitMessage] = useState('');
  const [isDbInitialized, setIsDbInitialized] = useState<boolean | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [jobTargets, setJobTargets] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState('');

  // Check if database is initialized on component mount
  useEffect(() => {
    checkDatabaseStatus();
    fetchJobTargets();
  }, []);

  useEffect(() => {
    if (jobTargets.length === 0) {
      if (selectedTarget !== '') {
        setSelectedTarget('');
      }
      return;
    }
    if (!selectedTarget || !jobTargets.includes(selectedTarget)) {
      setSelectedTarget(jobTargets[0]);
    }
  }, [jobTargets, selectedTarget]);

  const checkDatabaseStatus = async () => {
    try {
      setIsCheckingDb(true);
      const response = await fetch('/api/database/status');
      const data = await response.json();

      if (response.ok) {
        setIsDbInitialized(data.initialized);
      } else {
        console.error('Error checking database status:', data.error);
        setIsDbInitialized(false);
      }
    } catch (error) {
      console.error('Error checking database status:', error);
      setIsDbInitialized(false);
    } finally {
      setIsCheckingDb(false);
    }
  };

  const fetchJobTargets = async () => {
    try {
      const response = await fetch('/api/user-options');
      const data = await response.json();

      if (response.ok) {
        // Extract just the names from the job targets
        const targetNames = (data.options.jobTargets || []).map((t: any) => t.name);
        setJobTargets(targetNames);
      }
    } catch (error) {
      console.error('Error fetching job targets:', error);
    }
  };

  const handleImport = async () => {
    if (!urls.trim()) {
      alert('Please enter at least one URL');
      return;
    }
    if (!selectedTarget) {
      alert('Please select a job target before importing URLs');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/urls/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          urls: urls.trim(),
          target: selectedTarget,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        // Clear the textarea if import was successful
        if (data.success && data.validCount > 0) {
          setUrls('');
        }
      } else {
        alert(data.error || 'Failed to import URLs');
      }
    } catch (error) {
      console.error('Error importing URLs:', error);
      alert('An error occurred while importing URLs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeDatabase = async () => {
    setIsInitializing(true);
    setInitMessage('');

    try {
      const response = await fetch('/api/database/init', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setInitMessage(`✅ ${data.message} (${data.statusesCount} statuses)`);
        // Update the database status after successful initialization
        setIsDbInitialized(true);
      } else {
        setInitMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      setInitMessage('❌ An error occurred while initializing the database');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL your applications and rejected URLs? This action cannot be undone!')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch('/api/applications/delete-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Successfully deleted:\n- ${data.deleted.applications} application(s)\n- ${data.deleted.rejectedUrls} rejected URL(s)`);
        // Clear any results displayed
        setResult(null);
      } else {
        alert(`❌ ${data.error || 'Failed to delete data'}`);
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('❌ An error occurred while deleting data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              URL Management
            </h1>
            <p className="text-gray-600">
              Import job URLs to start tracking your applications. Each URL will be validated and stored as a new application.
            </p>
          </div>
          {/* Right side: Badge and Delete Button */}
          <div className="flex items-center gap-3">
            {/* Database Ready Badge */}
            {!isCheckingDb && isDbInitialized && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-full">
                <CheckCircle className="text-green-600" size={16} />
                <span className="text-sm font-medium text-green-800">Database Ready</span>
              </div>
            )}
            {/* Delete All Button */}
            <button 
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Delete all applications and rejected URLs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={20} />
                  <span>Delete All</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Database Initialization Card - Only show if DB is not initialized */}
      {!isCheckingDb && !isDbInitialized && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-4">
            <Database className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Database Initialization Required
              </h3>
              <p className="text-blue-700 mb-4">
                Before importing URLs, you need to initialize the database with the required statuses.
              </p>
              <button
                onClick={handleInitializeDatabase}
                disabled={isInitializing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Initializing...</span>
                  </>
                ) : (
                  <>
                    <Database size={20} />
                    <span>Initialize Database</span>
                  </>
                )}
              </button>
              {initMessage && (
                <p className="mt-3 text-sm font-medium">{initMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Job Target Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Target *
          </label>
          {jobTargets.length > 0 ? (
            <>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              >
                {jobTargets.map((target, index) => (
                  <option key={index} value={target}>
                    {target}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                💡 Job target also controls the export folder and configuration for the generated resume.
              </p>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ No job targets configured yet. Add at least one target from Options before importing URLs.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/options'}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline font-medium"
              >
                Configure job targets with export folders in Options →
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter URLs (one per line)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://example.com/job1&#10;https://example.com/job2&#10;https://example.com/job3"
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none"
            disabled={isLoading}
          />
          <p className="mt-2 text-sm text-gray-500">
            Paste your job URLs here, each on a new line. Invalid or duplicate URLs will be automatically filtered out.
          </p>
        </div>

        <button
          onClick={handleImport}
          disabled={isLoading || !urls.trim() || !selectedTarget}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Import URLs</span>
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Import Results
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Valid URLs */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="text-green-600" size={24} />
                <h3 className="font-semibold text-green-900">Valid URLs</h3>
              </div>
              <p className="text-3xl font-bold text-green-700">
                {result.validCount}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Successfully imported
              </p>
            </div>

            {/* Duplicate URLs */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="text-yellow-600" size={24} />
                <h3 className="font-semibold text-yellow-900">Duplicates</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-700">
                {result.duplicateCount}
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                Already in database
              </p>
            </div>

            {/* Invalid URLs */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="text-red-600" size={24} />
                <h3 className="font-semibold text-red-900">Invalid URLs</h3>
              </div>
              <p className="text-3xl font-bold text-red-700">
                {result.invalidCount}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Malformed URLs
              </p>
            </div>
          </div>

          {/* Details Section */}
          {result.details && (
            <div className="space-y-4">
              {/* Valid URLs Details */}
              {result.details.valid.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Valid URLs ({result.details.valid.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <ul className="space-y-1">
                      {result.details.valid.map((url, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-700 flex items-start space-x-2"
                        >
                          <CheckCircle
                            className="text-green-500 flex-shrink-0 mt-0.5"
                            size={16}
                          />
                          <span className="break-all">{url}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Duplicate URLs Details */}
              {result.details.duplicates.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Duplicate URLs ({result.details.duplicates.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <ul className="space-y-1">
                      {result.details.duplicates.map((url, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-700 flex items-start space-x-2"
                        >
                          <XCircle
                            className="text-yellow-500 flex-shrink-0 mt-0.5"
                            size={16}
                          />
                          <span className="break-all">{url}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Invalid URLs Details */}
              {result.details.invalid.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Invalid URLs ({result.details.invalid.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <ul className="space-y-1">
                      {result.details.invalid.map((url, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-700 flex items-start space-x-2"
                        >
                          <XCircle
                            className="text-red-500 flex-shrink-0 mt-0.5"
                            size={16}
                          />
                          <span className="break-all">{url}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

