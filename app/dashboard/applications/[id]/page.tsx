'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Loader2, FileText, CheckCircle, Copy, Sparkles, X, Trash2, AlertTriangle, MessageSquare } from 'lucide-react';
import Toast from '../../../../components/Toast';
import { renderHeaderPreview } from '../../resume-build-test/sections/header';
import { renderProfessionalSummaryPreview } from '../../resume-build-test/sections/professional-summary';
import { renderSkillsPreview } from '../../resume-build-test/sections/skills';
import { renderExperiencePreview } from '../../resume-build-test/sections/experience';
import { renderCertificationsPreview } from '../../resume-build-test/sections/certifications';
import { renderEducationPreview } from '../../resume-build-test/sections/education';
import { renderCoverLetterPreview } from '../../resume-build-test/sections/cover-letter';
import { Template2Preview } from '../../resume-build-test/sections/template2-preview';
import { normalizeResumeTemplate } from '@/lib/resume/template-ids';
import {
  normalizeExperienceOption,
  buildExperienceDynamicFromTailored,
  extractExperienceTitle,
  EXPERIENCE_PLACEHOLDER_OPTION_1,
  EXPERIENCE_PLACEHOLDER_OPTION_2,
} from '@/lib/resume/experience-option';
import { BoldTextArea } from '../components/BoldTextArea';
import { findSimilarCompanies } from '../utils/company-similarity';

interface Status {
  _id: string;
  order: number;
  value: string;
  description: string;
}

interface ApplicationDetail {
  _id: string;
  url: string;
  isEasyApply?: boolean;
  title?: string;
  target?: string;
  company_info?: {
    name?: string;
    salary?: string;
    other?: string;
  };
  statusValue: string;
  statusOrder: number;
  statusDescription: string;
  raw_jd?: string;
  analyze_result?: {
    stack?: string[];
    mindset?: string;
    ownership?: string;
    environment?: string;
    responsibility?: string[];
  };
  tailored_summary?: string;
  tailored_result1?: string[];
  tailored_result2?: string[];
  tailored_result3?: string[];
  tailored_certifications?: string[];
  cover_letter?: string[];
  export_location?: string;
  createdAt: string;
  updatedAt?: string;
  appliedAt?: string;
  bidFailedAt?: string;
  bidFailedReason?: string;
  ongoingAt?: string;
  failedAt?: string;
  offerAt?: string;
  comment?: string;
}

// Helper function to clean export location by removing status suffixes
const cleanExportLocation = (exportLocation: string): string => {
  if (!exportLocation) return exportLocation;
  // Remove status suffixes like _rsm_exported, _applied from folder names
  // Handle both Windows (\) and Unix (/) path separators
  return exportLocation
    .replace(/_rsm_exported([\\/]|$)/g, (match, sep) => sep || '')
    .replace(/_applied([\\/]|$)/g, (match, sep) => sep || '')
    .replace(/[\\/]$/, ''); // Remove trailing path separator if any
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const resumeTemplate = normalizeResumeTemplate(session?.user?.resumeTemplate);
  const experienceOption = normalizeExperienceOption(session?.user?.experienceOption);
  const experiencePlaceholder =
    experienceOption === 'option_2'
      ? EXPERIENCE_PLACEHOLDER_OPTION_2
      : EXPERIENCE_PLACEHOLDER_OPTION_1;
  const id = params?.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [allStatuses, setAllStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'analysis'>('details');
  const [copySuccess, setCopySuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [visibleExperiences, setVisibleExperiences] = useState(2);
  const [tailoredTab, setTailoredTab] = useState<'edit' | 'resume' | 'cover' | 'summary' | 'exp1' | 'exp2' | 'exp3'>('edit');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [applicationIds, setApplicationIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [appliedTab, setAppliedTab] = useState<'details' | 'track' | 'interviews'>('details');
  const [interviews, setInterviews] = useState<any[]>([]);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [newInterview, setNewInterview] = useState({
    date: '',
    interviewers: '',
    type: 'phone' as 'phone' | 'agency' | 'HR' | 'tech_qa' | 'live_coding' | 'system_design' | 'tech_discuss' | 'culture',
    savedVideoLocation: '',
    feedback: '',
    content: '',
    duration: '',
  });
  const [exportRootFolder, setExportRootFolder] = useState<string>('');
  const [applicationOrder, setApplicationOrder] = useState<number>(0);
  const [hasResumeConfig, setHasResumeConfig] = useState<boolean>(false);
  const [hasCoverLetterConfig, setHasCoverLetterConfig] = useState<boolean>(false);
  const [jobTargetConfig, setJobTargetConfig] = useState<any>(null);
  const [allApplications, setAllApplications] = useState<Array<{ _id: string; company_info?: { name?: string }; title?: string; status?: string; statusDescription?: string }>>([]);
  const [isBidFailedDialogOpen, setIsBidFailedDialogOpen] = useState(false);
  const [bidFailedReasonInput, setBidFailedReasonInput] = useState('');

  // Form state based on current status
  const [rawJd, setRawJd] = useState('');
  const [title, setTitle] = useState('');
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    salary: '',
    other: '',
  });
  const [analyzeResult, setAnalyzeResult] = useState({
    stack: [] as string[],
    mindset: '',
    ownership: '',
    environment: '',
    responsibility: [] as string[],
  });
  const [tailoredSummary, setTailoredSummary] = useState<string>('');
  const [tailoredResult1, setTailoredResult1] = useState<string[]>([]);
  const [tailoredResult2, setTailoredResult2] = useState<string[]>([]);
  const [tailoredResult3, setTailoredResult3] = useState<string[]>([]);
  const [tailoredCertifications, setTailoredCertifications] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const experienceDynamicPreview = buildExperienceDynamicFromTailored(
    tailoredResult2,
    tailoredResult3,
    experienceOption
  );
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchApplication();
      fetchApplicationIds();
      fetchInterviews();
    }
  }, [id]);

  // Fetch user options after application is loaded
  useEffect(() => {
    if (application) {
      fetchUserOptions();
    }
  }, [application?.target]);

  // Set default tab based on status
  useEffect(() => {
    if (application?.statusValue === 'rsm_exported') {
      setTailoredTab('summary');
    } else if (application?.statusValue === 'tailored') {
      setTailoredTab('edit');
    }
  }, [application?.statusValue]);

  const fetchApplicationIds = async () => {
    try {
      const response = await fetch('/api/applications/list');
      const data = await response.json();
      if (response.ok) {
        // Applications are already sorted by createdAt desc, _id desc from API
        const ids = data.applications.map((app: any) => app._id);
        setApplicationIds(ids);
        const index = ids.indexOf(id);
        setCurrentIndex(index);
        // Set application order (1-based index)
        setApplicationOrder(index + 1);
        // Store all applications for duplicate detection
        setAllApplications(data.applications);
      }
    } catch (err) {
      console.error('Error fetching application IDs:', err);
    }
  };

  const fetchInterviews = async () => {
    try {
      const response = await fetch(`/api/interviews?applicationId=${id}`);
      const data = await response.json();
      if (response.ok) {
        setInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error('Error fetching interviews:', err);
    }
  };

  const fetchUserOptions = async () => {
    try {
      const response = await fetch('/api/user-options');
      const data = await response.json();
      if (response.ok && application) {
        // Find the export folder for this application's target
        const targetConfig = data.options.jobTargets?.find((t: any) => t.name === application.target);
        setExportRootFolder(targetConfig?.exportFolder || '');
        setJobTargetConfig(targetConfig);
        // Check if configuration is defined
        setHasResumeConfig(!!(targetConfig?.resumeConfig?.header && targetConfig.resumeConfig.header[0]));
        setHasCoverLetterConfig(!!(targetConfig?.coverLetterConfig?.header && targetConfig.coverLetterConfig.header[0]));
      }
    } catch (err) {
      console.error('Error fetching user options:', err);
    }
  };

  const fetchApplication = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/applications/${id}`);
      const data = await response.json();

      if (response.ok) {
        // Clean up export_location if it contains old status suffixes
        if (data.application.export_location) {
          const cleanedLocation = cleanExportLocation(data.application.export_location);
          if (cleanedLocation !== data.application.export_location) {
            // Update the export_location in the database if it was changed
            data.application.export_location = cleanedLocation;
            // Update in database asynchronously (don't wait for it)
            fetch(`/api/applications/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ export_location: cleanedLocation }),
            }).catch(err => console.error('Error updating export_location:', err));
          }
        }
        
        setApplication(data.application);
        setAllStatuses(data.allStatuses);
        
        // Initialize form state with existing data
        if (data.application.raw_jd) {
          setRawJd(data.application.raw_jd);
        }
        if (data.application.title) {
          setTitle(data.application.title);
        }
        if (data.application.company_info) {
          setCompanyInfo({
            name: data.application.company_info.name || '',
            salary: data.application.company_info.salary || '',
            other: data.application.company_info.other || '',
          });
        }
        if (data.application.analyze_result) {
          setAnalyzeResult({
            stack: data.application.analyze_result.stack || [],
            mindset: data.application.analyze_result.mindset || '',
            ownership: data.application.analyze_result.ownership || '',
            environment: data.application.analyze_result.environment || '',
            responsibility: data.application.analyze_result.responsibility || [],
          });
        }
        if (data.application.tailored_summary) {
          setTailoredSummary(data.application.tailored_summary);
        }
        if (data.application.tailored_result1) {
          setTailoredResult1(data.application.tailored_result1);
        }
        if (data.application.tailored_result2) {
          setTailoredResult2(data.application.tailored_result2);
        }
        if (data.application.tailored_result3) {
          setTailoredResult3(data.application.tailored_result3);
        }
        if (data.application.cover_letter) {
          setCoverLetter(data.application.cover_letter);
        }
        if (data.application.tailored_certifications) {
          setTailoredCertifications(data.application.tailored_certifications);
        }
        if (data.application.comment) {
          setComment(data.application.comment);
        } else {
          setComment('');
        }
      } else {
        setToast({ message: data.error || 'Failed to fetch application', type: 'error' });
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      setToast({ message: 'An error occurred while fetching application', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndProgress = async () => {
    if (!application) return;

    try {
      setIsSaving(true);

      const currentStatus = application.statusValue;
      let updates: any = {};
      let nextStatusValue = currentStatus;

      // Determine what to save and next status based on current status
      switch (currentStatus) {
        case 'fresh':
          if (!rawJd.trim()) {
            setToast({ message: 'Please enter the job description', type: 'error' });
            setIsSaving(false);
            return;
          }
          updates.raw_jd = rawJd;
          nextStatusValue = 'jd_fetched';
          break;

        case 'jd_fetched':
          if (!title.trim()) {
            setToast({ message: 'Job title is required', type: 'error' });
            setIsSaving(false);
            return;
          }
          if (!companyInfo.name.trim()) {
            setToast({ message: 'Company name is required', type: 'error' });
            setIsSaving(false);
            return;
          }
          updates.title = title;
          updates.company_info = companyInfo;
          updates.analyze_result = analyzeResult;
          nextStatusValue = 'jd_analyzed';
          break;

        case 'jd_analyzed':
          updates.tailored_summary = tailoredSummary;
          updates.tailored_result1 = tailoredResult1;
          updates.tailored_result2 = tailoredResult2;
          updates.tailored_result3 = tailoredResult3;
          updates.tailored_certifications = tailoredCertifications;
          updates.cover_letter = coverLetter;
          nextStatusValue = 'tailored';
          break;

        case 'tailored':
          // Check if configuration is defined
          if (!hasResumeConfig || !hasCoverLetterConfig) {
            setToast({ message: 'Resume or cover letter configuration is missing. Please configure them in Options first.', type: 'error' });
            setIsSaving(false);
            return;
          }

          // Generate folder name for export
          const companyName = companyInfo.name || 'Unknown';
          const folderName = `${applicationOrder}_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}`;
          // Use path.join to handle path separators correctly for the OS
          const pathSeparator = exportRootFolder.includes('\\') ? '\\' : '/';
          const exportPath = exportRootFolder ? `${exportRootFolder}${pathSeparator}${folderName}` : folderName;
          
          // Create folder via backend
          if (exportRootFolder) {
            try {
              const folderResponse = await fetch('/api/folders/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ folderPath: exportPath }),
              });

              const folderData = await folderResponse.json();

              if (!folderResponse.ok) {
                setToast({ message: `Warning: ${folderData.error}. You may need to create the folder manually.`, type: 'error' });
              } else if (folderData.alreadyExists) {
                setToast({ message: 'Folder already exists', type: 'info' });
              } else {
                setToast({ message: 'Export folder created successfully!', type: 'success' });
              }
            } catch (err) {
              console.error('Error creating folder:', err);
              setToast({ message: 'Could not create folder. Please create it manually.', type: 'error' });
            }
          }

          // Save application data first
          updates.tailored_result1 = tailoredResult1;
          updates.tailored_result2 = tailoredResult2;
          updates.tailored_result3 = tailoredResult3;
          updates.tailored_certifications = tailoredCertifications;
          updates.cover_letter = coverLetter;
          updates.export_location = exportPath;

          // Update application first
          const updateResponse = await fetch(`/api/applications/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          const updateData = await updateResponse.json();
          if (!updateResponse.ok) {
            setToast({ message: updateData.error || 'Failed to update application', type: 'error' });
            setIsSaving(false);
            return;
          }

          // Call export API
          try {
            const exportResponse = await fetch('/api/resume/export', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ applicationId: id }),
            });

            const exportData = await exportResponse.json();
            if (!exportResponse.ok) {
              setToast({ message: exportData.error || 'Failed to export resume', type: 'error' });
              setIsSaving(false);
              return;
            }

            // Update status to rsm_exported and also update export_location with normalized path from export API
            const statusResponse = await fetch(`/api/applications/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                status: 'rsm_exported',
                export_location: exportData.exportLocation || exportPath, // Use normalized path from export API
              }),
            });

            const statusData = await statusResponse.json();
            if (statusResponse.ok) {
              setApplication(statusData.application);
              setToast({ message: 'Resume and cover letter exported successfully!', type: 'success' });
            } else {
              setToast({ message: statusData.error || 'Failed to update status', type: 'error' });
            }
          } catch (err) {
            console.error('Error exporting resume:', err);
            setToast({ message: 'An error occurred while exporting resume', type: 'error' });
          }

          setIsSaving(false);
          return;

        case 'rsm_exported': {
          // Delegate folder rename + status change to backend
          try {
            const applyResponse = await fetch('/api/applications/apply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ applicationId: id }),
            });

            const applyData = await applyResponse.json();

            if (applyResponse.ok) {
              setApplication(applyData.application);
              setToast({ message: applyData.message || 'Application marked as applied!', type: 'success' });
            } else {
              setToast({ message: applyData.error || 'Failed to mark application as applied', type: 'error' });
            }
          } catch (err) {
            console.error('Error marking application as applied:', err);
            setToast({ message: 'An error occurred while applying', type: 'error' });
          }

          setIsSaving(false);
          return;
        }

        default:
          setToast({ message: 'Cannot progress from this status', type: 'error' });
          setIsSaving(false);
          return;
      }

      // Update status
      updates.status = nextStatusValue;

      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        setApplication(data.application);
        setToast({ message: 'Application updated successfully!', type: 'success' });
      } else {
        setToast({ message: data.error || 'Failed to update application', type: 'error' });
      }
    } catch (err) {
      console.error('Error updating application:', err);
      setToast({ message: 'An error occurred while updating application', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = async (text?: string) => {
    const textToCopy = text || application?.raw_jd;
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        setToast({ message: 'Copied to clipboard!', type: 'success' });
      } catch (err) {
        console.error('Failed to copy:', err);
        setToast({ message: 'Failed to copy to clipboard', type: 'error' });
      }
    }
  };

  const handleUseAI = () => {
    // Placeholder for AI functionality
    setToast({ message: 'AI functionality will be implemented soon!', type: 'info' });
  };

  const handleAddInterview = async () => {
    if (!newInterview.type) {
      setToast({ message: 'Interview type is required', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: id,
          date: newInterview.date || new Date().toISOString(),
          interviewers: newInterview.interviewers,
          type: newInterview.type,
          savedVideoLocation: newInterview.savedVideoLocation,
          feedback: newInterview.feedback,
          content: newInterview.content,
          duration: newInterview.duration ? parseInt(newInterview.duration) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: 'Interview added successfully!', type: 'success' });
        setShowAddInterview(false);
        setNewInterview({
          date: '',
          interviewers: '',
          type: 'phone',
          savedVideoLocation: '',
          feedback: '',
          content: '',
          duration: '',
        });
        fetchInterviews();
      } else {
        setToast({ message: data.error || 'Failed to add interview', type: 'error' });
      }
    } catch (err) {
      console.error('Error adding interview:', err);
      setToast({ message: 'An error occurred while adding interview', type: 'error' });
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to delete this interview?')) {
      return;
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setToast({ message: 'Interview deleted successfully!', type: 'success' });
        fetchInterviews();
      } else {
        const data = await response.json();
        setToast({ message: data.error || 'Failed to delete interview', type: 'error' });
      }
    } catch (err) {
      console.error('Error deleting interview:', err);
      setToast({ message: 'An error occurred while deleting interview', type: 'error' });
    }
  };

  const handleDeleteApplication = async () => {
    if (!confirm(`⚠️ Are you sure you want to delete the application for "${application?.company_info?.name || 'Unknown'}"?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setToast({ message: 'Application deleted successfully', type: 'success' });
        // Navigate back to applications list after a short delay
        setTimeout(() => {
          router.push('/dashboard/applications');
        }, 1000);
      } else {
        const data = await response.json();
        setToast({ message: data.error || 'Failed to delete application', type: 'error' });
      }
    } catch (err) {
      console.error('Error deleting application:', err);
      setToast({ message: 'An error occurred while deleting application', type: 'error' });
    }
  };

  const handleSaveComment = async () => {
    if (!application) return;
    
    try {
      setIsSavingComment(true);
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment || null }),
      });

      const data = await response.json();
      if (response.ok) {
        setApplication(data.application);
        setToast({ message: 'Comment saved successfully!', type: 'success' });
        setIsCommentDialogOpen(false);
      } else {
        setToast({ message: data.error || 'Failed to save comment', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving comment:', err);
      setToast({ message: 'An error occurred while saving comment', type: 'error' });
    } finally {
      setIsSavingComment(false);
    }
  };

  const openCommentDialog = () => {
    if (!application) return;
    setComment(application.comment || '');
    setIsCommentDialogOpen(true);
  };

  const closeCommentDialog = () => {
    setIsCommentDialogOpen(false);
  };

  const handleStatusChange = async (newStatus: string, extraUpdates: Record<string, any> = {}) => {
    let wasSuccessful = false;
    try {
      setIsSaving(true);

      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...extraUpdates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setApplication(data.application);
        setToast({ message: `Status updated to ${newStatus.replace(/_/g, ' ')}!`, type: 'success' });
        // Refresh the page data
        await fetchApplication();
        wasSuccessful = true;
      } else {
        setToast({ message: data.error || 'Failed to update status', type: 'error' });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setToast({ message: 'An error occurred while updating status', type: 'error' });
    } finally {
      setIsSaving(false);
    }
    return wasSuccessful;
  };

  const openBidFailedDialog = () => {
    if (!application) return;
    setBidFailedReasonInput(application.bidFailedReason || '');
    setIsBidFailedDialogOpen(true);
  };

  const closeBidFailedDialog = () => {
    setIsBidFailedDialogOpen(false);
    setBidFailedReasonInput('');
  };

  const handleConfirmBidFailed = async () => {
    const reason = bidFailedReasonInput.trim();
    const success = await handleStatusChange('bid_failed', {
      bidFailedReason: reason || null,
    });
    if (success) {
      closeBidFailedDialog();
    }
  };

  const handlePreviousApplication = () => {
    if (currentIndex > 0) {
      const prevId = applicationIds[currentIndex - 1];
      router.push(`/dashboard/applications/${prevId}`);
    }
  };

  const handleNextApplication = () => {
    if (currentIndex < applicationIds.length - 1) {
      const nextId = applicationIds[currentIndex + 1];
      router.push(`/dashboard/applications/${nextId}`);
    }
  };

  const handleSave = async () => {
    if (!application) return false;

    try {
      setIsSaving(true);
      const currentStatus = application.statusValue;
      let updates: any = {};

      // Collect current form data based on status
      switch (currentStatus) {
        case 'fresh':
          if (rawJd.trim()) {
            updates.raw_jd = rawJd;
          }
          break;

        case 'jd_fetched':
          if (title.trim()) {
            updates.title = title;
          }
          if (companyInfo.name.trim()) {
            updates.company_info = companyInfo;
          }
          if (analyzeResult) {
            updates.analyze_result = analyzeResult;
          }
          break;

        case 'jd_analyzed':
          if (tailoredSummary) {
            updates.tailored_summary = tailoredSummary;
          }
          if (tailoredResult1) {
            updates.tailored_result1 = tailoredResult1;
          }
          if (tailoredResult2) {
            updates.tailored_result2 = tailoredResult2;
          }
          if (tailoredResult3) {
            updates.tailored_result3 = tailoredResult3;
          }
          if (tailoredCertifications) {
            updates.tailored_certifications = tailoredCertifications;
          }
          if (coverLetter) {
            updates.cover_letter = coverLetter;
          }
          break;

        case 'tailored':
        case 'rsm_exported':
        case 'applied':
        case 'bid_failed':
        case 'ongoing':
        case 'failed':
        case 'offer':
        case 'no_interest':
          // For these statuses, save any editable fields
          if (title.trim()) {
            updates.title = title;
          }
          if (companyInfo.name.trim()) {
            updates.company_info = companyInfo;
          }
          if (rawJd) {
            updates.raw_jd = rawJd;
          }
          if (analyzeResult) {
            updates.analyze_result = analyzeResult;
          }
          if (tailoredSummary) {
            updates.tailored_summary = tailoredSummary;
          }
          if (tailoredResult1) {
            updates.tailored_result1 = tailoredResult1;
          }
          if (tailoredResult2) {
            updates.tailored_result2 = tailoredResult2;
          }
          if (tailoredResult3) {
            updates.tailored_result3 = tailoredResult3;
          }
          if (tailoredCertifications) {
            updates.tailored_certifications = tailoredCertifications;
          }
          if (coverLetter) {
            updates.cover_letter = coverLetter;
          }
          break;
      }

      // Only save if there are updates
      if (Object.keys(updates).length === 0) {
        setIsSaving(false);
        return true;
      }

      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        setApplication(data.application);
        return true;
      } else {
        setToast({ message: data.error || 'Failed to save application', type: 'error' });
        return false;
      }
    } catch (err) {
      console.error('Error saving application:', err);
      setToast({ message: 'An error occurred while saving application', type: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToApplications = async () => {
    const saved = await handleSave();
    if (saved) {
      router.push('/dashboard/applications');
    }
  };

  const handleMarkNoInterest = async () => {
    if (!application) return;
    if (!confirm('Mark this application as No Interest? This will close the process.')) {
      return;
    }
    await handleStatusChange('no_interest');
  };

  const renderBaseActions = () => (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleDeleteApplication}
        disabled={isSaving}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
        title="Delete this application"
      >
        <Trash2 size={18} />
        <span>Delete</span>
      </button>
      {application?.statusValue !== 'no_interest' && (
        <button
          onClick={handleMarkNoInterest}
          disabled={isSaving}
          className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors border border-orange-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Mark No Interest
        </button>
      )}
      <button
        onClick={handleBackToApplications}
        disabled={isSaving}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {isSaving && <Loader2 className="animate-spin" size={16} />}
        <span>Save and Back to Applications</span>
      </button>
    </div>
  );

  const getButtonLabel = () => {
    if (!application) return 'Save';
    
    switch (application.statusValue) {
      case 'fresh':
        return 'Save';
      case 'jd_fetched':
        return 'Save';
      case 'jd_analyzed':
        return 'Save';
      case 'tailored':
        return 'Export Resume';
      case 'rsm_exported':
        return 'Mark as Applied';
      default:
        return 'Save';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      fresh: 'bg-blue-100 text-blue-800 border-blue-300',
      jd_fetched: 'bg-purple-100 text-purple-800 border-purple-300',
      jd_analyzed: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      tailored: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      rsm_exported: 'bg-teal-100 text-teal-800 border-teal-300',
      applied: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      bid_failed: 'bg-red-100 text-red-800 border-red-300',
      ongoing: 'bg-orange-100 text-orange-800 border-orange-300',
      failed: 'bg-gray-100 text-gray-800 border-gray-300',
      offer: 'bg-green-100 text-green-800 border-green-300',
      no_interest: 'bg-rose-100 text-rose-800 border-rose-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const renderApplicationDetailsSection = () => {
    if (!application) return null;
    return (
      <div className="space-y-4">
        {application.raw_jd && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Job Description</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {application.raw_jd}
            </div>
          </div>
        )}

        {application.company_info && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Company Info</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-1">
              {application.company_info.name && (
                <p><strong>Name:</strong> {application.company_info.name}</p>
              )}
              {application.company_info.salary && (
                <p><strong>Salary:</strong> {application.company_info.salary}</p>
              )}
              {application.company_info.other && (
                <p><strong>Other:</strong> {application.company_info.other}</p>
              )}
            </div>
          </div>
        )}

        {application.analyze_result && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Analysis</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-2">
              {application.analyze_result.stack && application.analyze_result.stack.length > 0 && (
                <p><strong>Stack:</strong> {application.analyze_result.stack.join(', ')}</p>
              )}
              {application.analyze_result.mindset && (
                <p><strong>Mindset:</strong> {application.analyze_result.mindset}</p>
              )}
              {application.analyze_result.ownership && (
                <p><strong>Ownership:</strong> {application.analyze_result.ownership}</p>
              )}
              {application.analyze_result.environment && (
                <p><strong>Environment:</strong> {application.analyze_result.environment}</p>
              )}
              {application.analyze_result.responsibility && application.analyze_result.responsibility.length > 0 && (
                <p><strong>Responsibilities:</strong> {application.analyze_result.responsibility.join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {application.statusValue !== 'applied' && (application.tailored_result1 || application.tailored_result2 || application.tailored_result3) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tailored Resume</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-3">
              {application.tailored_result1 && application.tailored_result1.length > 0 && (
                <div>
                  {application.tailored_result1.map((bullet, i) => (
                    <div key={i}>{bullet}</div>
                  ))}
                </div>
              )}
              {application.tailored_result2 && application.tailored_result2.length > 0 && (
                <div>
                  {application.tailored_result2.map((bullet, i) => (
                    <div key={i}>{bullet}</div>
                  ))}
                </div>
              )}
              {application.tailored_result3 && application.tailored_result3.length > 0 && (
                <div>
                  {application.tailored_result3.map((bullet, i) => (
                    <div key={i}>{bullet}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {application.statusValue !== 'applied' && application.cover_letter && application.cover_letter.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Cover Letter</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-2">
              {application.cover_letter.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-gray-500">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-2xl">⚠</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Application Not Found</h3>
          <p className="text-gray-500 max-w-sm text-center">The application you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/dashboard/applications')}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <>
      {/* Fixed Comment Button - Right Mid Position */}
      <button
        onClick={openCommentDialog}
        className="fixed right-6 top-1/2 -translate-y-1/2 z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl hover:scale-110 flex items-center justify-center"
        title="Add or edit comment"
        aria-label="Open comment dialog"
      >
        <MessageSquare size={24} />
      </button>

      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Application Info Card - Sticky Header */}
      <div className="bg-white rounded-xl shadow-md p-6 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {application.title || 'Untitled Position'}
              </h1>
              {(application.isEasyApply ?? !application.url) && (
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-800 border border-purple-200"
                  title="Easy Apply entry"
                >
                  <Sparkles size={16} />
                  <span className="sr-only">Easy Apply entry</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-2 mb-2">
              <p className="text-lg text-gray-700">
                {application.company_info?.name || 'Company not specified'}
              </p>
              {(() => {
                const similarCompanies = findSimilarCompanies(application, allApplications);
                if (similarCompanies.length > 0) {
                  return (
                    <div className="relative group">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 border border-orange-200 cursor-help"
                        title="Similar application detected"
                      >
                        <AlertTriangle size={14} />
                        <span className="sr-only">Possible duplicate</span>
                      </span>
                      <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-pre-line max-w-xs">
                          <div className="font-semibold mb-1.5 text-white">Similar Companies:</div>
                          {similarCompanies.map((similar, idx) => (
                            <div key={idx} className="mb-1 text-gray-100 last:mb-0">
                              <div className="font-medium">{similar.companyName} - {similar.position}</div>
                              {similar.status && (
                                <div className="text-gray-300 text-xs mt-0.5">
                                  Status: {similar.statusDescription || similar.status}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="absolute right-full top-3 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            {application.company_info?.salary && (
              <p className="text-sm text-gray-600 mb-2">
                Salary: {application.company_info.salary}
              </p>
            )}
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all"
            >
              {application.url}
            </a>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(
                application.statusValue
              )}`}
            >
              {application.statusValue.replace(/_/g, ' ').toUpperCase()}
            </span>
            
            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousApplication}
                disabled={currentIndex <= 0 || applicationIds.length === 0}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-400"
                title="Previous application"
                type="button"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-600 min-w-[80px] text-center">
                {applicationIds.length > 0 ? `${currentIndex + 1} / ${applicationIds.length}` : '-'}
              </span>
              <button
                onClick={handleNextApplication}
                disabled={currentIndex >= applicationIds.length - 1 || applicationIds.length === 0}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-400"
                title="Next application"
                type="button"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Form based on status */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {application.statusValue === 'fresh' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 1: Enter Job Description
              </h2>
              <p className="text-gray-600 mb-4">
                Copy and paste the raw job description from the URL. This will be used to analyze the position.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Raw Job Description *
                </label>
                <button
                  onClick={handleUseAI}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Sparkles size={16} />
                  <span>Use AI</span>
                </button>
              </div>
              <textarea
                value={rawJd}
                onChange={(e) => setRawJd(e.target.value)}
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder="Paste the job description here..."
              />
            </div>
            <div className="flex flex-wrap justify-between items-center gap-4">
              {renderBaseActions()}
              <button
                onClick={handleSaveAndProgress}
                disabled={isSaving || !rawJd.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{getButtonLabel()}</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {application.statusValue === 'jd_fetched' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 2: Analyze Job Description
              </h2>
              <p className="text-gray-600 mb-4">
                Add job details and extract key information from the job description to tailor your resume.
              </p>
            </div>

            {/* Two-column layout: JD on left (50%), Tabs on right (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - Job Description */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-fit">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Job Description (Reference)</h3>
                  <button
                    onClick={() => handleCopyToClipboard()}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                  {application.raw_jd}
                </div>
              </div>

              {/* Right column - Tabs for Job Details and Analysis */}
              <div className="space-y-4">
                {/* Tab Navigation with Use AI Button */}
                <div className="flex items-center justify-between border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`px-4 py-2 font-medium text-sm transition-colors ${
                        activeTab === 'details'
                          ? 'border-b-2 border-indigo-600 text-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Job Details
                    </button>
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className={`px-4 py-2 font-medium text-sm transition-colors ${
                        activeTab === 'analysis'
                          ? 'border-b-2 border-indigo-600 text-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Job Analysis
                    </button>
                  </div>
                  <button
                    onClick={handleUseAI}
                    className="flex items-center space-x-2 px-3 py-1.5 mb-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <Sparkles size={16} />
                    <span>Use AI</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                  {activeTab === 'details' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Job Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="e.g., Senior Software Engineer"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={companyInfo.name}
                          onChange={(e) =>
                            setCompanyInfo({ ...companyInfo, name: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="e.g., TechCorp Inc."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Salary Range
                        </label>
                        <input
                          type="text"
                          value={companyInfo.salary}
                          onChange={(e) =>
                            setCompanyInfo({ ...companyInfo, salary: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="e.g., $120k - $150k"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Other Info (Optional)
                        </label>
                        <textarea
                          value={companyInfo.other}
                          onChange={(e) =>
                            setCompanyInfo({ ...companyInfo, other: e.target.value })
                          }
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Location, benefits, remote options, etc."
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tech Stack (comma separated)
                        </label>
                        <input
                          type="text"
                          value={analyzeResult.stack.join(', ')}
                          onChange={(e) =>
                            setAnalyzeResult({
                              ...analyzeResult,
                              stack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="e.g., React, Node.js, TypeScript, MongoDB"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mindset</label>
                        <textarea
                          value={analyzeResult.mindset}
                          onChange={(e) =>
                            setAnalyzeResult({ ...analyzeResult, mindset: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="What mindset/culture does the company value?"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ownership</label>
                        <textarea
                          value={analyzeResult.ownership}
                          onChange={(e) =>
                            setAnalyzeResult({ ...analyzeResult, ownership: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="What ownership/autonomy expectations?"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                        <textarea
                          value={analyzeResult.environment}
                          onChange={(e) =>
                            setAnalyzeResult({ ...analyzeResult, environment: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Work environment and team structure"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Key Responsibilities (one per line)
                        </label>
                        <textarea
                          value={analyzeResult.responsibility.join('\n')}
                          onChange={(e) =>
                            setAnalyzeResult({
                              ...analyzeResult,
                              responsibility: e.target.value.split('\n').filter(Boolean),
                            })
                          }
                          rows={5}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Key responsibilities (one per line)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4">
              {renderBaseActions()}
              <button
                onClick={handleSaveAndProgress}
                disabled={isSaving || !title.trim() || !companyInfo.name.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{getButtonLabel()}</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {application.statusValue === 'jd_analyzed' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Step 3: Tailor Resume & Cover Letter
                </h2>
                <p className="text-gray-600">
                  Create tailored resume experiences and cover letter for this position.
                </p>
              </div>
              <button
                onClick={handleUseAI}
                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <Sparkles size={16} />
                <span>Use AI</span>
              </button>
            </div>

            {/* Two-column layout: JD & Analysis on left (35%), Form on right (65%) */}
            <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6">
              {/* Left column - Job Description & Analysis */}
              <div className="space-y-4">
                {/* Raw JD */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Job Description</h3>
                    <button
                      onClick={() => handleCopyToClipboard()}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {copySuccess ? (
                        <>
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {application.raw_jd}
                  </div>
                </div>

                {/* Analysis */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Analysis</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    {analyzeResult.stack.length > 0 && (
                      <p><strong>Stack:</strong> {analyzeResult.stack.join(', ')}</p>
                    )}
                    {analyzeResult.mindset && (
                      <p><strong>Mindset:</strong> {analyzeResult.mindset}</p>
                    )}
                    {analyzeResult.ownership && (
                      <p><strong>Ownership:</strong> {analyzeResult.ownership}</p>
                    )}
                    {analyzeResult.environment && (
                      <p><strong>Environment:</strong> {analyzeResult.environment}</p>
                    )}
                    {analyzeResult.responsibility.length > 0 && (
                      <p><strong>Responsibilities:</strong> {analyzeResult.responsibility.join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - Tailored Results Form */}
              <div className="space-y-4 pr-6">
                {/* Tailored Summary Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tailored Summary
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    A brief summary highlighting how your experience aligns with this position.
                  </p>
                  <BoldTextArea
                    value={tailoredSummary}
                    onChange={setTailoredSummary}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                    placeholder="Results-driven software engineer with 5+ years of experience in **scalable web applications**..."
                  />
                </div>

                {/* Experience Fields and Cover Letter in One Row */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Experiences Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Resume Experiences
                      </label>
                      {visibleExperiences < 3 && (
                        <button
                          onClick={() => setVisibleExperiences(visibleExperiences + 1)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <span className="text-lg font-semibold">+</span>
                          <span>Add Experience</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter your skill sets, one per line (e.g., "Backend: Node.js, Python, Java").
                    </p>

                    {/* Skill Sets */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Skill Sets
                      </label>
                      <BoldTextArea
                        value={tailoredResult1.join('\n')}
                        onChange={(value) =>
                          setTailoredResult1(value.split('\n').filter(Boolean))
                        }
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder="Backend: **Node.js**, Python, Java&#10;Frontend: **React**, Angular, Vue&#10;Database: **PostgreSQL**, MongoDB"
                      />
                    </div>

                    {/* Experience 2 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Second Experience
                      </label>
                      <BoldTextArea
                        value={tailoredResult2.join('\n')}
                        onChange={(value) =>
                          setTailoredResult2(value.split('\n').filter(Boolean))
                        }
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder={experiencePlaceholder}
                      />
                    </div>

                    {/* Experience 3 - Initially Hidden */}
                    {visibleExperiences >= 3 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Third Experience
                        </label>
                        <BoldTextArea
                          value={tailoredResult3.join('\n')}
                          onChange={(value) =>
                            setTailoredResult3(value.split('\n').filter(Boolean))
                          }
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                          placeholder={experiencePlaceholder}
                        />
                      </div>
                    )}

                    {/* Certifications */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Certifications
                      </label>
                      <BoldTextArea
                        value={tailoredCertifications.join('\n')}
                        onChange={(value) =>
                          setTailoredCertifications(value.split('\n').filter(Boolean))
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder="**AWS Certified** Solutions Architect&#10;Meta Full-Stack Engineer"
                      />
                    </div>
                  </div>

                  {/* Cover Letter Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Each line break creates a new array element. Enter your cover letter content line by line.
                    </p>
                    <BoldTextArea
                      value={coverLetter.join('\n')}
                      onChange={(value) =>
                        setCoverLetter(value.split('\n').filter(Boolean))
                      }
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                      placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the **Senior Engineer** role..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-200">
              {renderBaseActions()}
              <button
                onClick={handleSaveAndProgress}
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{getButtonLabel()}</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>

          </div>
        )}

         {application.statusValue === 'tailored' && (
           <div className="space-y-6">
             <div>
               <h2 className="text-xl font-semibold text-gray-900 mb-4">
                 Step 4: Review & Export Resume
               </h2>
               <p className="text-gray-600 mb-4">
                 Review and edit your tailored resume and cover letter before exporting.
               </p>
             </div>

                {/* Export Root Folder Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Export Location</h3>
                  {!application.target ? (
                    <div>
                      <p className="text-sm text-blue-700 mb-2">
                        ⚠️ This application doesn't have a job target assigned.
                      </p>
                      <p className="text-xs text-blue-600 mb-2">
                        Job targets are assigned when importing URLs. To set up export folders for future applications:
                      </p>
                      <button
                        onClick={() => router.push('/dashboard/options')}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Configure job targets with export folders in Options
                      </button>
                    </div>
                  ) : exportRootFolder ? (
                    <div className="space-y-2">
                      <div className="mb-2">
                        <p className="text-xs text-blue-700 mb-1">Job Target:</p>
                        <p className="text-sm font-semibold text-blue-900 bg-blue-100 px-3 py-2 rounded">
                          {application.target}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 mb-1">Root Folder:</p>
                        <p className="text-sm font-mono text-blue-900 bg-blue-100 px-3 py-2 rounded">
                          {exportRootFolder}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 mb-1">Folder to Create:</p>
                        <p className="text-sm font-mono text-blue-900 bg-blue-100 px-3 py-2 rounded">
                          {applicationOrder}_{companyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}
                        </p>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 The folder will be automatically created when you click "Export Resume".
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-blue-700 mb-2">
                        ⚠️ Target "{application.target}" doesn't have an export folder configured.
                      </p>
                      <button
                        onClick={() => router.push('/dashboard/options')}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Set up export folder for this target in Options
                      </button>
                    </div>
                  )}
                </div>

             {/* Tab Navigation */}
             <div className="flex border-b border-gray-200">
               <button
                 onClick={() => setTailoredTab('edit')}
                 className={`px-4 py-2 font-medium text-sm transition-colors ${
                   tailoredTab === 'edit'
                     ? 'border-b-2 border-indigo-600 text-indigo-600'
                     : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 Edit
               </button>
               <button
                 onClick={() => setTailoredTab('resume')}
                 className={`px-4 py-2 font-medium text-sm transition-colors ${
                   tailoredTab === 'resume'
                     ? 'border-b-2 border-indigo-600 text-indigo-600'
                     : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 Resume Preview
               </button>
               <button
                 onClick={() => setTailoredTab('cover')}
                 className={`px-4 py-2 font-medium text-sm transition-colors ${
                   tailoredTab === 'cover'
                     ? 'border-b-2 border-indigo-600 text-indigo-600'
                     : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 Cover Letter Preview
               </button>
             </div>

             {/* Tab Content */}
             {tailoredTab === 'edit' && (
               <div className="space-y-4">
                 {/* Tailored Summary */}
                 <div className="border border-gray-200 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-gray-700">
                       Tailored Summary
                     </label>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleCopyToClipboard(tailoredSummary)}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                       >
                         <Copy size={14} />
                         <span>Copy</span>
                       </button>
                       <button
                         onClick={() => setEditingField(editingField === 'summary' ? null : 'summary')}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                       >
                         <span>{editingField === 'summary' ? 'Done' : 'Edit'}</span>
                       </button>
                     </div>
                   </div>
                   <BoldTextArea
                     value={tailoredSummary}
                     onChange={setTailoredSummary}
                     rows={4}
                     readOnly={editingField !== 'summary'}
                     className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                       editingField === 'summary'
                         ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                         : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                     }`}
                     placeholder="Results-driven software engineer with 5+ years of experience in **scalable web applications**..."
                   />
                 </div>

                 {/* Skill Sets */}
                 <div className="border border-gray-200 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-gray-700">
                       Skill Sets
                     </label>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleCopyToClipboard(tailoredResult1.join('\n'))}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                       >
                         <Copy size={14} />
                         <span>Copy</span>
                       </button>
                       <button
                         onClick={() => setEditingField(editingField === 'exp1' ? null : 'exp1')}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                       >
                         <span>{editingField === 'exp1' ? 'Done' : 'Edit'}</span>
                       </button>
                     </div>
                   </div>
                   <BoldTextArea
                     value={tailoredResult1.join('\n')}
                     onChange={(value) =>
                       setTailoredResult1(value.split('\n').filter(Boolean))
                     }
                     rows={5}
                     readOnly={editingField !== 'exp1'}
                     className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                       editingField === 'exp1'
                         ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                         : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                     }`}
                     placeholder="Backend: **Node.js**, Python, Java&#10;Frontend: **React**, Angular, Vue"
                   />
                 </div>

                 {/* Experience 2 */}
                 <div className="border border-gray-200 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-gray-700">
                       Second Experience
                     </label>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleCopyToClipboard(tailoredResult2.join('\n'))}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                       >
                         <Copy size={14} />
                         <span>Copy</span>
                       </button>
                       <button
                         onClick={() => setEditingField(editingField === 'exp2' ? null : 'exp2')}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                       >
                         <span>{editingField === 'exp2' ? 'Done' : 'Edit'}</span>
                       </button>
                     </div>
                   </div>
                   <BoldTextArea
                     value={tailoredResult2.join('\n')}
                     onChange={(value) =>
                       setTailoredResult2(value.split('\n').filter(Boolean))
                     }
                     rows={5}
                     readOnly={editingField !== 'exp2'}
                     className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                       editingField === 'exp2'
                         ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                         : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                     }`}
                     placeholder={experiencePlaceholder}
                   />
                 </div>

                 {/* Experience 3 */}
                 {tailoredResult3.length > 0 && (
                   <div className="border border-gray-200 rounded-lg p-4">
                     <div className="flex items-center justify-between mb-2">
                       <label className="block text-sm font-medium text-gray-700">
                         Third Experience
                       </label>
                       <div className="flex space-x-2">
                         <button
                           onClick={() => handleCopyToClipboard(tailoredResult3.join('\n'))}
                           className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                         >
                           <Copy size={14} />
                           <span>Copy</span>
                         </button>
                         <button
                           onClick={() => setEditingField(editingField === 'exp3' ? null : 'exp3')}
                           className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                         >
                           <span>{editingField === 'exp3' ? 'Done' : 'Edit'}</span>
                         </button>
                       </div>
                     </div>
                     <BoldTextArea
                       value={tailoredResult3.join('\n')}
                       onChange={(value) =>
                         setTailoredResult3(value.split('\n').filter(Boolean))
                       }
                       rows={5}
                       readOnly={editingField !== 'exp3'}
                       className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                         editingField === 'exp3'
                           ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                           : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                       }`}
                       placeholder={experiencePlaceholder}
                     />
                   </div>
                 )}

                 {/* Certifications */}
                 <div className="border border-gray-200 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-gray-700">
                       Certifications
                     </label>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleCopyToClipboard(tailoredCertifications.join('\n'))}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                       >
                         <Copy size={14} />
                         <span>Copy</span>
                       </button>
                       <button
                         onClick={() => setEditingField(editingField === 'certs' ? null : 'certs')}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                       >
                         <span>{editingField === 'certs' ? 'Done' : 'Edit'}</span>
                       </button>
                     </div>
                   </div>
                   <BoldTextArea
                     value={tailoredCertifications.join('\n')}
                     onChange={(value) =>
                       setTailoredCertifications(value.split('\n').filter(Boolean))
                     }
                     rows={4}
                     readOnly={editingField !== 'certs'}
                     className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                       editingField === 'certs'
                         ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                         : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                     }`}
                     placeholder="**AWS Certified** Solutions Architect&#10;Meta Full-Stack Engineer"
                   />
                 </div>

                 {/* Cover Letter */}
                 <div className="border border-gray-200 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-gray-700">
                       Cover Letter
                     </label>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleCopyToClipboard(coverLetter.join('\n\n'))}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                       >
                         <Copy size={14} />
                         <span>Copy</span>
                       </button>
                       <button
                         onClick={() => setEditingField(editingField === 'cover' ? null : 'cover')}
                         className="flex items-center space-x-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                       >
                         <span>{editingField === 'cover' ? 'Done' : 'Edit'}</span>
                       </button>
                     </div>
                   </div>
                   <BoldTextArea
                     value={coverLetter.join('\n')}
                     onChange={(value) =>
                       setCoverLetter(value.split('\n').filter(Boolean))
                     }
                     rows={10}
                     readOnly={editingField !== 'cover'}
                     className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                       editingField === 'cover'
                         ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
                         : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                     }`}
                     placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the **Senior Engineer** role..."
                   />
                 </div>
               </div>
             )}

             {/* Resume Preview Tab */}
             {tailoredTab === 'resume' && (
               <div className="bg-white border border-gray-200 rounded-lg p-6">
                 {!hasResumeConfig ? (
                   <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                     <p className="text-sm text-yellow-800 mb-2">
                       Resume configuration is not defined for this job target.
                     </p>
                     <button
                       onClick={() => router.push('/dashboard/options')}
                       className="text-sm text-yellow-600 hover:text-yellow-800 underline"
                     >
                       Configure resume settings in Options
                     </button>
                   </div>
                 ) : (
                   <div 
                     className="bg-gray-50 rounded-lg border border-gray-200"
                     style={{
                       fontFamily: 'Arial, sans-serif',
                       minHeight: '400px',
                       padding: '0.5in',
                       position: 'relative',
                     }}
                   >
                    {jobTargetConfig?.resumeConfig && resumeTemplate === 'template_2' && (
                      <Template2Preview
                        fullName={jobTargetConfig.resumeConfig.header?.[0] || ''}
                        contact={jobTargetConfig.resumeConfig.header?.[2] || ''}
                        summary={tailoredSummary || ''}
                        skills={tailoredResult1 || []}
                        experienceStatic={jobTargetConfig.resumeConfig.experience_static || []}
                        experienceDynamic={experienceDynamicPreview}
                        education={jobTargetConfig.resumeConfig.education || []}
                        certifications={tailoredCertifications}
                      />
                    )}
                    {jobTargetConfig?.resumeConfig && resumeTemplate === 'template_1' && (
                       <>
                         {renderHeaderPreview([
                           jobTargetConfig.resumeConfig.header?.[0] || '',
                           extractExperienceTitle(tailoredResult2) ||
                             jobTargetConfig.resumeConfig.header?.[1] ||
                             '',
                           jobTargetConfig.resumeConfig.header?.[2] || '',
                         ])}
                         {renderProfessionalSummaryPreview([tailoredSummary || ''])}
                         {renderSkillsPreview({ 
                           skills: tailoredResult1 || [],
                         })}
                         {renderExperiencePreview({
                           experience_static: jobTargetConfig.resumeConfig.experience_static || [],
                           experience_dynamic: experienceDynamicPreview,
                         })}
                         {renderCertificationsPreview({ certifications: tailoredCertifications })}
                         {renderEducationPreview(jobTargetConfig.resumeConfig.education || [])}
                       </>
                     )}
                   </div>
                 )}
               </div>
             )}

             {/* Cover Letter Preview Tab */}
             {tailoredTab === 'cover' && (
               <div className="bg-white border border-gray-200 rounded-lg p-6">
                 {!hasCoverLetterConfig ? (
                   <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                     <p className="text-sm text-yellow-800 mb-2">
                       Cover letter configuration is not defined for this job target.
                     </p>
                     <button
                       onClick={() => router.push('/dashboard/options')}
                       className="text-sm text-yellow-600 hover:text-yellow-800 underline"
                     >
                       Configure cover letter settings in Options
                     </button>
                   </div>
                 ) : (
                   <div 
                     className="bg-gray-50 rounded-lg border border-gray-200"
                     style={{
                       fontFamily: 'Arial, sans-serif',
                       minHeight: '400px',
                       padding: '0.5in',
                       position: 'relative',
                     }}
                   >
                     {jobTargetConfig?.coverLetterConfig && (
                       renderCoverLetterPreview({
                         header: jobTargetConfig.coverLetterConfig.header,
                         content: coverLetter || [],
                         footer: jobTargetConfig.coverLetterConfig.footer,
                       })
                     )}
                   </div>
                 )}
               </div>
             )}

            <div className="flex flex-wrap justify-between items-center gap-4">
              {renderBaseActions()}
              {!hasResumeConfig || !hasCoverLetterConfig ? (
                 <button
                   onClick={() => router.push('/dashboard/options')}
                   className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                 >
                   <FileText size={20} />
                   <span>Configure Resume & Cover Letter First</span>
                 </button>
               ) : (
                 <button
                   onClick={handleSaveAndProgress}
                   disabled={isSaving}
                   className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                 >
                   {isSaving ? (
                     <>
                       <Loader2 className="animate-spin" size={20} />
                       <span>Exporting...</span>
                     </>
                   ) : (
                     <>
                       <FileText size={20} />
                       <span>{getButtonLabel()}</span>
                     </>
                   )}
                 </button>
              )}
            </div>
           </div>
         )}

        {application.statusValue === 'rsm_exported' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 5: Mark as Applied
              </h2>
              <p className="text-gray-600 mb-4">
                Once you've submitted your application, mark it as applied to track your progress.
              </p>
            </div>

            {/* Export Location Info */}
            {application.export_location && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Export Folder</h3>
                <p className="text-sm font-mono text-blue-900 bg-blue-100 px-3 py-2 rounded break-all">
                  {cleanExportLocation(application.export_location)}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  📁 Your resume files should be in this folder.
                </p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-sm font-semibold text-green-900">Resume Exported</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your tailored resume and cover letter have been prepared. Submit your application and mark it as applied.
                  </p>
                </div>
                </div>
            </div>

            {/* Resume Content Preview with Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exported Content Preview</h3>
              
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setTailoredTab('summary')}
                  className={`px-4 py-2 text-sm font-medium ${
                    tailoredTab === 'summary'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setTailoredTab('exp1')}
                  className={`px-4 py-2 text-sm font-medium ${
                    tailoredTab === 'exp1'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Experience 1
                </button>
                {tailoredResult2.length > 0 && (
                  <button
                    onClick={() => setTailoredTab('exp2')}
                    className={`px-4 py-2 text-sm font-medium ${
                      tailoredTab === 'exp2'
                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Experience 2
                  </button>
                )}
                {tailoredResult3.length > 0 && (
                  <button
                    onClick={() => setTailoredTab('exp3')}
                    className={`px-4 py-2 text-sm font-medium ${
                      tailoredTab === 'exp3'
                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Experience 3
                  </button>
                )}
                {coverLetter.length > 0 && (
                  <button
                    onClick={() => setTailoredTab('cover')}
                    className={`px-4 py-2 text-sm font-medium ${
                      tailoredTab === 'cover'
                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Cover Letter
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {/* Summary Tab */}
                {tailoredTab === 'summary' && (
                  <div>
                    {tailoredSummary ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Professional Summary</h4>
                          <button
                            onClick={() => handleCopyToClipboard(tailoredSummary)}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Copy size={16} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{tailoredSummary}</p>
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">No summary available for this application.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Skill Sets Tab */}
                {tailoredTab === 'exp1' && (
                  <div>
                    {tailoredResult1.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Skill Sets</h4>
                          <button
                            onClick={() => handleCopyToClipboard(tailoredResult1.join('\n'))}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Copy size={16} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <ul className="list-disc list-inside space-y-1">
                            {tailoredResult1.map((bullet, i) => (
                              <li key={i} className="text-gray-700 text-sm">{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">No experience content available.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Experience 2 Tab */}
                {tailoredTab === 'exp2' && (
                  <div>
                    {tailoredResult2.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Second Experience</h4>
                          <button
                            onClick={() => handleCopyToClipboard(tailoredResult2.join('\n'))}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Copy size={16} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <ul className="list-disc list-inside space-y-1">
                            {tailoredResult2.map((bullet, i) => (
                              <li key={i} className="text-gray-700 text-sm">{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">No second experience content available.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Experience 3 Tab */}
                {tailoredTab === 'exp3' && (
                  <div>
                    {tailoredResult3.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Third Experience</h4>
                          <button
                            onClick={() => handleCopyToClipboard(tailoredResult3.join('\n'))}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Copy size={16} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <ul className="list-disc list-inside space-y-1">
                            {tailoredResult3.map((bullet, i) => (
                              <li key={i} className="text-gray-700 text-sm">{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">No third experience content available.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cover Letter Tab */}
                {tailoredTab === 'cover' && (
                  <div>
                    {coverLetter.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Cover Letter</h4>
                          <button
                            onClick={() => handleCopyToClipboard(coverLetter.join('\n'))}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Copy size={16} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          {coverLetter.map((para, i) => (
                            <p key={i} className="text-gray-700 text-sm leading-relaxed">{para}</p>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">No cover letter content available.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4">
              {renderBaseActions()}
              <button
                onClick={handleSaveAndProgress}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>{getButtonLabel()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {['applied', 'bid_failed', 'ongoing', 'failed', 'offer'].includes(application.statusValue) && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Application Management
              </h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setAppliedTab('details')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  appliedTab === 'details'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setAppliedTab('track')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  appliedTab === 'track'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Track
              </button>
              <button
                onClick={() => setAppliedTab('interviews')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  appliedTab === 'interviews'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Interviews ({interviews.length})
              </button>
            </div>

            {/* Details Tab */}
            {appliedTab === 'details' && renderApplicationDetailsSection()}

            {/* Track Tab */}
            {appliedTab === 'track' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Application Progress</h3>
                  
                  {/* Status Change Buttons */}
                  <div className="flex items-center space-x-2">
                    {application.statusValue === 'applied' && (
                      <>
                        <button
                          onClick={async () => {
                            if (confirm('Mark this application as ongoing (moved to interview stage)?')) {
                              await handleStatusChange('ongoing');
                            }
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Mark Ongoing
                        </button>
                        <button
                          onClick={openBidFailedDialog}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Bid Failed
                        </button>
                      </>
                    )}
                    {application.statusValue === 'ongoing' && (
                      <>
                        <button
                          onClick={async () => {
                            if (confirm('Mark this application as failed?')) {
                              await handleStatusChange('failed');
                            }
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Failed
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Mark this application as offer received? 🎉')) {
                              await handleStatusChange('offer');
                            }
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Offer Received
                        </button>
                      </>
                    )}
                    {['bid_failed', 'failed', 'offer'].includes(application.statusValue) && (
                      <span className="text-sm text-gray-500 italic">Final status reached</span>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                        {application.statusValue.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ 
                        width: `${
                          application.statusValue === 'applied' ? '20%' :
                          application.statusValue === 'bid_failed' ? '40%' :
                          application.statusValue === 'ongoing' ? '60%' :
                          application.statusValue === 'failed' ? '80%' :
                          application.statusValue === 'offer' ? '100%' : '0%'
                        }` 
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      ['applied', 'bid_failed', 'ongoing', 'failed', 'offer'].includes(application.statusValue)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      ✓
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Applied</h4>
                      <p className="text-sm text-gray-600">Application submitted</p>
                      {application.appliedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      application.statusValue === 'bid_failed'
                        ? 'bg-red-500 text-white'
                        : ['ongoing', 'failed', 'offer'].includes(application.statusValue)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {application.statusValue === 'bid_failed' ? '✗' : 
                       ['ongoing', 'failed', 'offer'].includes(application.statusValue) ? '✓' : '○'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Interview Stage / Bid Status</h4>
                      <p className="text-sm text-gray-600">
                        {application.statusValue === 'bid_failed' 
                          ? 'Bid failed - application not selected' 
                          : 'Moving to interview process'}
                      </p>
                      {application.bidFailedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(application.bidFailedAt).toLocaleDateString()}
                        </p>
                      )}
                      {application.bidFailedReason && (
                        <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800">
                          <p className="font-semibold text-red-900">Recorded reason</p>
                          <p className="mt-1 whitespace-pre-wrap">{application.bidFailedReason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      application.statusValue === 'ongoing'
                        ? 'bg-green-500 text-white'
                        : ['failed', 'offer'].includes(application.statusValue)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {['ongoing', 'failed', 'offer'].includes(application.statusValue) ? '✓' : '○'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Ongoing Interviews</h4>
                      <p className="text-sm text-gray-600">Active interview process</p>
                      {application.ongoingAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(application.ongoingAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      application.statusValue === 'failed'
                        ? 'bg-red-500 text-white'
                        : application.statusValue === 'offer'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {application.statusValue === 'failed' ? '✗' : 
                       application.statusValue === 'offer' ? '✓' : '○'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Final Result</h4>
                      <p className="text-sm text-gray-600">
                        {application.statusValue === 'failed' 
                          ? 'Interview failed - not selected' 
                          : application.statusValue === 'offer'
                          ? 'Offer received!'
                          : 'Awaiting final decision'}
                      </p>
                      {(application.failedAt || application.offerAt) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(application.failedAt || application.offerAt || '').toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
            <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-200">
              {renderBaseActions()}
            </div>
          </div>
            )}

            {/* Interviews Tab */}
            {appliedTab === 'interviews' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Interviews</h3>
                  <button
                    onClick={() => setShowAddInterview(!showAddInterview)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    {showAddInterview ? 'Cancel' : 'Add Interview'}
                  </button>
                </div>

                {/* Add Interview Form */}
                {showAddInterview && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">New Interview</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="datetime-local"
                          value={newInterview.date}
                          onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type *
                        </label>
                        <select
                          value={newInterview.type}
                          onChange={(e) => setNewInterview({ ...newInterview, type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        >
                          <option value="phone">Phone</option>
                          <option value="agency">Agency</option>
                          <option value="HR">HR</option>
                          <option value="tech_qa">Tech Q&A</option>
                          <option value="live_coding">Live Coding</option>
                          <option value="system_design">System Design</option>
                          <option value="tech_discuss">Tech Discussion</option>
                          <option value="culture">Culture Fit</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Interviewers
                        </label>
                        <input
                          type="text"
                          value={newInterview.interviewers}
                          onChange={(e) => setNewInterview({ ...newInterview, interviewers: e.target.value })}
                          placeholder="John Doe, Jane Smith"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={newInterview.duration}
                          onChange={(e) => setNewInterview({ ...newInterview, duration: e.target.value })}
                          placeholder="60"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Saved Video Location
                        </label>
                        <input
                          type="text"
                          value={newInterview.savedVideoLocation}
                          onChange={(e) => setNewInterview({ ...newInterview, savedVideoLocation: e.target.value })}
                          placeholder="C:\Interviews\video.mp4"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Content / Notes
                        </label>
                        <textarea
                          value={newInterview.content}
                          onChange={(e) => setNewInterview({ ...newInterview, content: e.target.value })}
                          rows={3}
                          placeholder="Interview questions, topics discussed..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Feedback
                        </label>
                        <textarea
                          value={newInterview.feedback}
                          onChange={(e) => setNewInterview({ ...newInterview, feedback: e.target.value })}
                          rows={3}
                          placeholder="Feedback received from interviewers..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddInterview(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddInterview}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        Add Interview
                      </button>
                    </div>
                  </div>
                )}

                {/* Interviews List */}
                {interviews.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No interviews recorded yet.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add your first interview to start tracking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interviews.map((interview) => (
                      <div
                        key={interview._id}
                        className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {interview.type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              {interview.duration && (
                                <span className="text-xs text-gray-500">
                                  {interview.duration} min
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {new Date(interview.date).toLocaleString()}
                            </p>
                            {interview.interviewers && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Interviewers:</strong> {interview.interviewers}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteInterview(interview._id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                            title="Delete interview"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {interview.content && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700">Content:</p>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                              {interview.content}
                            </p>
                          </div>
                        )}

                        {interview.feedback && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700">Feedback:</p>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                              {interview.feedback}
                            </p>
                          </div>
                        )}

                        {interview.savedVideoLocation && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700">Video Location:</p>
                            <p className="text-sm text-gray-600 mt-1 font-mono">
                              {interview.savedVideoLocation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
         )}

        {application.statusValue === 'no_interest' && (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-orange-900 mb-2">
                Application marked as No Interest
              </h2>
              <p className="text-sm text-orange-800">
                You opted out from continuing this opportunity. You can still review the stored information below or delete the application.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Position</h3>
                <p className="text-lg text-gray-900 font-medium">
                  {application.title || 'Untitled Position'}
                </p>
                <p className="text-sm text-gray-600">
                  {application.company_info?.name || 'Unknown company'}
                </p>
              </div>

              {renderApplicationDetailsSection()}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4">
              {renderBaseActions()}
            </div>
          </div>
        )}
       </div>

       {/* Back to Applications Button at Bottom */}
       <div className="flex justify-center pt-6 pb-12">
         <button
           onClick={() => router.push('/dashboard/applications')}
           className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
         >
           <ChevronLeft size={20} />
           <span>Back to Applications</span>
         </button>
       </div>
      </div>

      {isBidFailedDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add a reason for bid failure</h3>
                <p className="text-sm text-gray-500">Optional context shown in the application timeline.</p>
              </div>
              <button
                onClick={closeBidFailedDialog}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                rows={4}
                value={bidFailedReasonInput}
                onChange={(e) => setBidFailedReasonInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-800"
                placeholder="Example: Client selected an internal candidate, rate too high, etc."
              />
              <p className="text-xs text-gray-500 mt-2">
                This note will be visible inside the application record.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeBidFailedDialog}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBidFailed}
                disabled={isSaving}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save &amp; Mark Failed</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Dialog */}
      {isCommentDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Application Comment</h3>
                <p className="text-sm text-gray-500">Add your comments or notes about this application. You can update this at any status.</p>
              </div>
              <button
                onClick={closeCommentDialog}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                rows={6}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-800"
                placeholder="Add your comments or notes about this application..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeCommentDialog}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSavingComment}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComment}
                disabled={isSavingComment}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSavingComment ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Comment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
   );
 }

