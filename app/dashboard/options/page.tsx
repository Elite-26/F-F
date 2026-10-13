'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, Folder, Loader2, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import Toast from '../../../components/Toast';

interface ResumeConfig {
  header: string[]; // [name, title, contact]
  experience_static: string[]; // [company1, location1, dateRange1, company2, location2, dateRange2, ...]
  certifications: string[]; // Array of certification strings
  education: string[][]; // Array of [university, degree, dateRange] entries
}

interface CoverLetterConfig {
  header: string[]; // [name, contact]
  footer: string[]; // [closing, signature]
}

interface JobTargetConfig {
  name: string;
  exportFolder: string;
  resumeConfig?: ResumeConfig;
  coverLetterConfig?: CoverLetterConfig;
}

interface UserOptions {
  _id: string;
  userId: string;
  jobTargets: JobTargetConfig[];
  createdAt: string;
  updatedAt?: string;
}

export default function OptionsPage() {
  const [options, setOptions] = useState<UserOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [jobTargets, setJobTargets] = useState<JobTargetConfig[]>([]);
  const [newJobTarget, setNewJobTarget] = useState({ name: '', exportFolder: '' });
  const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user-options');
      const data = await response.json();

      if (response.ok) {
        setOptions(data.options);
        setJobTargets(data.options.jobTargets || []);
      } else {
        setToast({ message: data.error || 'Failed to fetch options', type: 'error' });
      }
    } catch (err) {
      console.error('Error fetching options:', err);
      setToast({ message: 'An error occurred while fetching options', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch('/api/user-options', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTargets,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOptions(data.options);
        setToast({ message: 'Options saved successfully!', type: 'success' });
      } else {
        setToast({ message: data.error || 'Failed to save options', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving options:', err);
      setToast({ message: 'An error occurred while saving options', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddJobTarget = () => {
    if (!newJobTarget.name.trim()) {
      setToast({ message: 'Please enter a job target name', type: 'error' });
      return;
    }

    if (!newJobTarget.exportFolder.trim()) {
      setToast({ message: 'Please select an export folder', type: 'error' });
      return;
    }

    if (jobTargets.some(t => t.name === newJobTarget.name.trim())) {
      setToast({ message: 'This job target already exists', type: 'error' });
      return;
    }

    const newTarget: JobTargetConfig = {
      name: newJobTarget.name.trim(),
      exportFolder: newJobTarget.exportFolder.trim(),
      resumeConfig: {
        header: ['', '', ''],
        experience_static: [],
        certifications: [],
        education: [],
      },
      coverLetterConfig: {
        header: ['', ''],
        footer: ['', ''],
      },
    };

    setJobTargets([...jobTargets, newTarget]);
    setNewJobTarget({ name: '', exportFolder: '' });
    setToast({ message: 'Job target added. Don\'t forget to save!', type: 'info' });
  };

  const handleRemoveJobTarget = (index: number) => {
    setJobTargets(jobTargets.filter((_, i) => i !== index));
    const newExpanded = new Set(expandedTargets);
    newExpanded.delete(index);
    setExpandedTargets(newExpanded);
    setToast({ message: 'Job target removed. Don\'t forget to save!', type: 'info' });
  };

  const toggleExpandTarget = (index: number) => {
    const newExpanded = new Set(expandedTargets);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTargets(newExpanded);
  };

  const updateResumeConfig = (index: number, field: keyof ResumeConfig, value: any) => {
    const updated = [...jobTargets];
    if (!updated[index].resumeConfig) {
      updated[index].resumeConfig = {
        header: ['', '', ''],
        experience_static: [],
        certifications: [],
        education: [],
      };
    }
    (updated[index].resumeConfig as any)[field] = value;
    setJobTargets(updated);
  };

  const updateCoverLetterConfig = (index: number, field: keyof CoverLetterConfig, value: any) => {
    const updated = [...jobTargets];
    if (!updated[index].coverLetterConfig) {
      updated[index].coverLetterConfig = {
        header: ['', ''],
        footer: ['', ''],
      };
    }
    (updated[index].coverLetterConfig as any)[field] = value;
    setJobTargets(updated);
  };

  const addExperienceStaticEntry = (index: number) => {
    const updated = [...jobTargets];
    if (!updated[index].resumeConfig) {
      updated[index].resumeConfig = {
        header: ['', '', ''],
        experience_static: [],
        certifications: [],
        education: [],
      };
    }
    updated[index].resumeConfig!.experience_static.push('', '', '');
    setJobTargets(updated);
  };

  const removeExperienceStaticEntry = (index: number, expIndex: number) => {
    const updated = [...jobTargets];
    if (updated[index].resumeConfig) {
      // Remove 3 entries (company, location, dateRange)
      updated[index].resumeConfig!.experience_static.splice(expIndex * 3, 3);
      setJobTargets(updated);
    }
  };

  const addEducation = (index: number) => {
    const updated = [...jobTargets];
    if (!updated[index].resumeConfig) {
      updated[index].resumeConfig = {
        header: ['', '', ''],
        experience_static: [],
        certifications: [],
        education: [],
      };
    }
    updated[index].resumeConfig!.education.push(['', '', '']);
    setJobTargets(updated);
  };

  const removeEducation = (index: number, eduIndex: number) => {
    const updated = [...jobTargets];
    if (updated[index].resumeConfig) {
      updated[index].resumeConfig!.education.splice(eduIndex, 1);
      setJobTargets(updated);
    }
  };

  const showFolderPathHelp = () => {
    const helpText = `How to get your folder path:

Windows:
1. Open File Explorer
2. Navigate to your folder
3. Click the address bar at the top
4. Copy the full path (e.g., C:\\Users\\YourName\\Documents\\Resumes)
5. Paste it here

Mac:
1. Open Finder
2. Navigate to your folder
3. Right-click → Get Info
4. Copy the path under "Where:"
5. Paste it here

Linux:
1. Open file manager
2. Navigate to your folder
3. Copy the path from the address bar
4. Paste it here`;
    
    alert(helpText);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-gray-500">Loading options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Options</h1>
        <p className="text-gray-600">
          Configure your default settings, job targets, and resume/cover letter templates
        </p>
      </div>

      {/* Job Targets with Export Folders */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Targets & Export Folders</h2>
        <p className="text-sm text-gray-600 mb-4">
          Define job targets with their export folders and resume/cover letter configurations. Each job target will have resumes exported to its own folder.
        </p>

        {/* Add New Job Target */}
        <div className="mb-6 border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Add New Job Target
          </label>
          <div className="space-y-3">
            <input
              type="text"
              value={newJobTarget.name}
              onChange={(e) => setNewJobTarget({ ...newJobTarget, name: e.target.value })}
              placeholder="Job target name (e.g., AI job in US)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newJobTarget.exportFolder}
                  onChange={(e) => setNewJobTarget({ ...newJobTarget, exportFolder: e.target.value })}
                  placeholder="Export folder path (e.g., C:\Resumes\AI_US)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  onClick={showFolderPathHelp}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 whitespace-nowrap"
                  title="Show help for finding folder path"
                  type="button"
                >
                  <Folder size={20} />
                  <span>Help</span>
                </button>
              </div>
              <p className="text-xs text-gray-500">
                💡 Click "Help" for instructions on how to copy your folder path
              </p>
            </div>
            <button
              onClick={handleAddJobTarget}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Job Target</span>
            </button>
          </div>
        </div>

        {/* Existing Job Targets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Configured Job Targets ({jobTargets.length})
          </label>
          {jobTargets.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-500">No job targets configured yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Add your first job target with an export folder to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobTargets.map((target, index) => (
                <div
                  key={index}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">{target.name}</p>
                      <input
                        type="text"
                        value={target.exportFolder}
                        onChange={(e) => {
                          const updated = [...jobTargets];
                          updated[index].exportFolder = e.target.value;
                          setJobTargets(updated);
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono mb-2"
                        placeholder="Export folder path"
                      />
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => toggleExpandTarget(index)}
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                        title={expandedTargets.has(index) ? 'Collapse configuration' : 'Expand configuration'}
                      >
                        {expandedTargets.has(index) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button
                        onClick={() => handleRemoveJobTarget(index)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Remove job target"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Configuration Section */}
                  {expandedTargets.has(index) && (
                    <div className="mt-4 pt-4 border-t border-gray-300 space-y-6">
                      {/* Resume Configuration */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <Settings size={16} className="mr-2" />
                          Resume Configuration
                        </h3>
                        
                        {/* Header */}
                        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Header</label>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={target.resumeConfig?.header?.[0] || ''}
                              onChange={(e) => {
                                const header = [...(target.resumeConfig?.header || ['', '', ''])];
                                header[0] = e.target.value;
                                updateResumeConfig(index, 'header', header);
                              }}
                              placeholder="Name"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              value={target.resumeConfig?.header?.[1] || ''}
                              onChange={(e) => {
                                const header = [...(target.resumeConfig?.header || ['', '', ''])];
                                header[1] = e.target.value;
                                updateResumeConfig(index, 'header', header);
                              }}
                              placeholder="Title (e.g., [Senior Software Engineer])"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              value={target.resumeConfig?.header?.[2] || ''}
                              onChange={(e) => {
                                const header = [...(target.resumeConfig?.header || ['', '', ''])];
                                header[2] = e.target.value;
                                updateResumeConfig(index, 'header', header);
                              }}
                              placeholder="Contact (e.g., City, State • Phone • Email)"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        {/* Experience Static */}
                        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-gray-700">Experience Static</label>
                            <button
                              onClick={() => addExperienceStaticEntry(index)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                            >
                              <Plus size={12} />
                              <span>Add Experience</span>
                            </button>
                          </div>
                          <div className="space-y-2">
                            {Array.from({ length: Math.floor((target.resumeConfig?.experience_static?.length || 0) / 3) }).map((_, expIndex) => (
                              <div key={expIndex} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                <div className="flex-1 space-y-2">
                                  <input
                                    type="text"
                                    value={target.resumeConfig?.experience_static?.[expIndex * 3] || ''}
                                    onChange={(e) => {
                                      const exp = [...(target.resumeConfig?.experience_static || [])];
                                      exp[expIndex * 3] = e.target.value;
                                      updateResumeConfig(index, 'experience_static', exp);
                                    }}
                                    placeholder="Company"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="text"
                                    value={target.resumeConfig?.experience_static?.[expIndex * 3 + 1] || ''}
                                    onChange={(e) => {
                                      const exp = [...(target.resumeConfig?.experience_static || [])];
                                      exp[expIndex * 3 + 1] = e.target.value;
                                      updateResumeConfig(index, 'experience_static', exp);
                                    }}
                                    placeholder="Location"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="text"
                                    value={target.resumeConfig?.experience_static?.[expIndex * 3 + 2] || ''}
                                    onChange={(e) => {
                                      const exp = [...(target.resumeConfig?.experience_static || [])];
                                      exp[expIndex * 3 + 2] = e.target.value;
                                      updateResumeConfig(index, 'experience_static', exp);
                                    }}
                                    placeholder="Date Range (e.g., 08/2022 ~ 11/2025)"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <button
                                  onClick={() => removeExperienceStaticEntry(index, expIndex)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Education */}
                        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-gray-700">Education</label>
                            <button
                              onClick={() => addEducation(index)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                            >
                              <Plus size={12} />
                              <span>Add</span>
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(target.resumeConfig?.education || []).map((edu, eduIndex) => (
                              <div key={eduIndex} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                <div className="flex-1 space-y-2">
                                  <input
                                    type="text"
                                    value={edu[0] || ''}
                                    onChange={(e) => {
                                      const education = [...(target.resumeConfig?.education || [])];
                                      education[eduIndex] = [e.target.value, education[eduIndex]?.[1] || '', education[eduIndex]?.[2] || ''];
                                      updateResumeConfig(index, 'education', education);
                                    }}
                                    placeholder="University"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="text"
                                    value={edu[1] || ''}
                                    onChange={(e) => {
                                      const education = [...(target.resumeConfig?.education || [])];
                                      education[eduIndex] = [education[eduIndex]?.[0] || '', e.target.value, education[eduIndex]?.[2] || ''];
                                      updateResumeConfig(index, 'education', education);
                                    }}
                                    placeholder="Degree"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <input
                                    type="text"
                                    value={edu[2] || ''}
                                    onChange={(e) => {
                                      const education = [...(target.resumeConfig?.education || [])];
                                      education[eduIndex] = [education[eduIndex]?.[0] || '', education[eduIndex]?.[1] || '', e.target.value];
                                      updateResumeConfig(index, 'education', education);
                                    }}
                                    placeholder="Date Range (e.g., 04/2012 ~ 07/2016)"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <button
                                  onClick={() => removeEducation(index, eduIndex)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Cover Letter Configuration */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <Settings size={16} className="mr-2" />
                          Cover Letter Configuration
                        </h3>
                        
                        {/* Header */}
                        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Header</label>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={target.coverLetterConfig?.header?.[0] || ''}
                              onChange={(e) => {
                                const header = [...(target.coverLetterConfig?.header || ['', ''])];
                                header[0] = e.target.value;
                                updateCoverLetterConfig(index, 'header', header);
                              }}
                              placeholder="Name"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              value={target.coverLetterConfig?.header?.[1] || ''}
                              onChange={(e) => {
                                const header = [...(target.coverLetterConfig?.header || ['', ''])];
                                header[1] = e.target.value;
                                updateCoverLetterConfig(index, 'header', header);
                              }}
                              placeholder="Contact (e.g., City, State • Phone • Email)"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Footer</label>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={target.coverLetterConfig?.footer?.[0] || ''}
                              onChange={(e) => {
                                const footer = [...(target.coverLetterConfig?.footer || ['', ''])];
                                footer[0] = e.target.value;
                                updateCoverLetterConfig(index, 'footer', footer);
                              }}
                              placeholder="Closing (e.g., Best regards)"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              value={target.coverLetterConfig?.footer?.[1] || ''}
                              onChange={(e) => {
                                const footer = [...(target.coverLetterConfig?.footer || ['', ''])];
                                footer[1] = e.target.value;
                                updateCoverLetterConfig(index, 'footer', footer);
                              }}
                              placeholder="Signature (e.g., Your Name)"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Save Options</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
