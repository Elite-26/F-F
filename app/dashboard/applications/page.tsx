'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Filter, ExternalLink, Loader2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, AlertTriangle, Download, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { findSimilarCompanies, areCompaniesSimilar } from './utils/company-similarity';
import Toast from '../../../components/Toast';

interface ApplicationData {
  _id: string;
  url: string;
  isEasyApply?: boolean;
  title?: string;
  target?: string;
  company_info?: {
    name?: string;
    salary?: string;
  };
  status: string;
  statusOrder: number;
  statusDescription: string;
  createdAt: string;
  updatedAt?: string;
  appliedAt?: string;
}

type EasyApplyFilter = 'all' | 'easy' | 'non_easy';

interface FilterConfig {
  statuses: string[];
  easyApply: EasyApplyFilter;
  createdAtFrom: string;
  createdAtTo: string;
  appliedAtFrom: string;
  appliedAtTo: string;
}

const defaultFilterConfig: FilterConfig = {
  statuses: [],
  easyApply: 'all',
  createdAtFrom: '',
  createdAtTo: '',
  appliedAtFrom: '',
  appliedAtTo: '',
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [availableTargetsFromApps, setAvailableTargetsFromApps] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterConfig>(defaultFilterConfig);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Search bar expanded state
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Easy Apply state
  const [showEasyApplyModal, setShowEasyApplyModal] = useState(false);
  const [easyApplyForm, setEasyApplyForm] = useState({ companyName: '', title: '', target: '', url: '' });
  const [availableTargets, setAvailableTargets] = useState<string[]>([]);
  const [isCreatingEasyApply, setIsCreatingEasyApply] = useState(false);
  const [duplicateCompanyWarning, setDuplicateCompanyWarning] = useState<string>('');
  const easyApplyFirstInputRef = useRef<HTMLInputElement | null>(null);
  
  // Search input ref
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Selection state (persisted in localStorage)
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importTarget, setImportTarget] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch applications on component mount
  useEffect(() => {
    fetchApplications();
    // Load selected applications from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedApplications');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSelectedApplications(new Set(parsed));
        } catch {
          setSelectedApplications(new Set());
        }
      }
    }
  }, []);

  // Persist selected applications to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedApplications', JSON.stringify(Array.from(selectedApplications)));
    }
  }, [selectedApplications]);

  // Clean up selection when applications are removed
  useEffect(() => {
    if (applications.length > 0) {
      const applicationIds = new Set(applications.map(app => app._id));
      setSelectedApplications(prev => {
        const next = new Set<string>();
        prev.forEach(id => {
          if (applicationIds.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
    }
  }, [applications]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('applicationsFilters');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFilters({
          ...defaultFilterConfig,
          ...parsed,
          statuses: Array.isArray(parsed?.statuses) ? parsed.statuses : [],
          easyApply: ['all', 'easy', 'non_easy'].includes(parsed?.easyApply)
            ? parsed.easyApply
            : 'all',
        });
      } catch {
        setFilters(defaultFilterConfig);
      }
    }
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined') return;
    localStorage.setItem('applicationsFilters', JSON.stringify(filters));
  }, [filters, filtersHydrated]);

  useEffect(() => {
    if (availableTargets.length === 0) {
      if (easyApplyForm.target) {
        setEasyApplyForm((prev) => ({ ...prev, target: '' }));
      }
      return;
    }
    if (!easyApplyForm.target || !availableTargets.includes(easyApplyForm.target)) {
      setEasyApplyForm((prev) => ({ ...prev, target: availableTargets[0] }));
    }
  }, [availableTargets, easyApplyForm.target]);

  useEffect(() => {
    if (showEasyApplyModal) {
      const frame = requestAnimationFrame(() => {
        easyApplyFirstInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [showEasyApplyModal]);

  useEffect(() => {
    if (!isFilterDrawerOpen && isFilterDrawerVisible) {
      const timer = setTimeout(() => setIsFilterDrawerVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isFilterDrawerOpen, isFilterDrawerVisible]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/applications/list');
      const data = await response.json();

      if (response.ok) {
        setApplications(data.applications);
        
        // Extract unique targets from applications
        const targets = new Set<string>();
        const statuses = new Set<string>();
        data.applications.forEach((app: ApplicationData) => {
          if (app.target) {
            targets.add(app.target);
          }
          if (app.status) {
            statuses.add(app.status);
          }
        });
        setAvailableTargetsFromApps(Array.from(targets).sort());
        setAvailableStatuses(Array.from(statuses).sort());
      } else {
        setError(data.error || 'Failed to fetch applications');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('An error occurred while fetching applications');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter applications based on search term and selected tab
  const filteredApplications = applications.filter((app) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (app.url || '').toLowerCase().includes(searchLower) ||
      app.company_info?.name?.toLowerCase().includes(searchLower) ||
      app.title?.toLowerCase().includes(searchLower) ||
      app.status.toLowerCase().includes(searchLower);

    // Filter by tab
    if (selectedTab === 'all') {
      return matchesSearch;
    } else if (selectedTab === 'no-target') {
      return matchesSearch && !app.target;
    } else {
      return matchesSearch && app.target === selectedTab;
    }
  }).filter((app) => {
    const matchesStatus =
      filters.statuses.length === 0 || filters.statuses.includes(app.status);

    const isEasyApply = app.isEasyApply ?? !app.url;
    const matchesEasyApply =
      filters.easyApply === 'all' ||
      (filters.easyApply === 'easy' && isEasyApply) ||
      (filters.easyApply === 'non_easy' && !isEasyApply);

    const createdDate = app.createdAt ? new Date(app.createdAt) : null;
    const appliedDate = app.appliedAt ? new Date(app.appliedAt) : null;

    const createdFromPass =
      !filters.createdAtFrom ||
      (createdDate && createdDate >= new Date(filters.createdAtFrom));
    const createdToPass =
      !filters.createdAtTo ||
      (createdDate && createdDate <= new Date(filters.createdAtTo + 'T23:59:59'));

    const appliedFromPass =
      !filters.appliedAtFrom ||
      (appliedDate && appliedDate >= new Date(filters.appliedAtFrom));
    const appliedToPass =
      !filters.appliedAtTo ||
      (appliedDate && appliedDate <= new Date(filters.appliedAtTo + 'T23:59:59'));

    return (
      matchesStatus &&
      matchesEasyApply &&
      createdFromPass &&
      createdToPass &&
      appliedFromPass &&
      appliedToPass
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTab, itemsPerPage, filters]);

  // Count applications for each tab
  const getTabCount = (tabValue: string) => {
    if (tabValue === 'all') {
      return applications.length;
    } else if (tabValue === 'no-target') {
      return applications.filter(app => !app.target).length;
    } else {
      return applications.filter(app => app.target === tabValue).length;
    }
  };

  useEffect(() => {
    fetchUserOptions();
  }, []);

  const fetchUserOptions = async () => {
    try {
      const response = await fetch('/api/user-options');
      const data = await response.json();
      if (response.ok) {
        const targets = data.options.jobTargets?.map((t: any) => t.name) || [];
        setAvailableTargets(targets);
      }
    } catch (err) {
      console.error('Error fetching user options:', err);
    }
  };

  const handleAddApplication = () => {
    setShowEasyApplyModal(true);
  };

  const handleCreateEasyApply = async () => {
    if (!easyApplyForm.companyName.trim()) {
      setToast({ message: 'Please enter a company name', type: 'error' });
      return;
    }
    if (!easyApplyForm.target.trim()) {
      setToast({ message: 'Please select a job target', type: 'error' });
      return;
    }

    try {
      setIsCreatingEasyApply(true);
      const response = await fetch('/api/applications/create-easy-apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: easyApplyForm.companyName,
          title: easyApplyForm.title || undefined,
          target: easyApplyForm.target,
          url: easyApplyForm.url?.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setShowEasyApplyModal(false);
        setEasyApplyForm({ companyName: '', title: '', target: '', url: '' });
        setToast({ message: 'Easy Apply application created successfully!', type: 'success' });
        await fetchApplications();
        router.push(`/dashboard/applications/${data.application._id}`);
      } else {
        setToast({ message: data.error || 'Failed to create Easy Apply application', type: 'error' });
      }
    } catch (err) {
      console.error('Error creating Easy Apply:', err);
      setToast({ message: 'An error occurred while creating Easy Apply application', type: 'error' });
    } finally {
      setIsCreatingEasyApply(false);
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
        setToast({ 
          message: `Successfully deleted ${data.deleted.applications} application(s) and ${data.deleted.rejectedUrls} rejected URL(s)`, 
          type: 'success' 
        });
        // Refresh the applications list
        await fetchApplications();
      } else {
        setToast({ message: data.error || 'Failed to delete data', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      setToast({ message: 'An error occurred while deleting data', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteApplication = async (appId: string, companyName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click navigation

    if (!confirm(`⚠️ Are you sure you want to delete the application for "${companyName}"?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        // Remove from selection if selected
        setSelectedApplications(prev => {
          const next = new Set(prev);
          next.delete(appId);
          return next;
        });
        setToast({ message: 'Application deleted successfully', type: 'success' });
        // Refresh the applications list
        await fetchApplications();
      } else {
        setToast({ message: data.error || 'Failed to delete application', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      setToast({ message: 'An error occurred while deleting application', type: 'error' });
    }
  };

  // Selection handlers
  const handleSelectApplication = (appId: string, checked: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click navigation
    setSelectedApplications(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(appId);
      } else {
        next.delete(appId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedApplications(prev => {
      const next = new Set(prev);
      if (checked) {
        // Add all applications on current page
        paginatedApplications.forEach(app => next.add(app._id));
      } else {
        // Remove all applications on current page
        paginatedApplications.forEach(app => next.delete(app._id));
      }
      return next;
    });
  };

  const isAllSelected = paginatedApplications.length > 0 && paginatedApplications.every(app => selectedApplications.has(app._id));
  const isSomeSelected = paginatedApplications.some(app => selectedApplications.has(app._id));

  // Bulk operations
  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedApplications);
    if (selectedIds.length === 0) {
      setToast({ message: 'Please select at least one application', type: 'error' });
      return;
    }

    if (!confirm(`⚠️ Are you sure you want to delete ${selectedIds.length} application(s)?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);
      const response = await fetch('/api/applications/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationIds: selectedIds }),
      });

      const data = await response.json();

      if (response.ok) {
        let message = `Successfully deleted ${data.deleted.applications} application(s)`;
        if (data.deleted.folders > 0) {
          message += ` and ${data.deleted.folders} export folder(s)`;
        }
        if (data.folderErrors && data.folderErrors.length > 0) {
          message += `. Note: Some folders could not be deleted.`;
          console.warn('Folder deletion errors:', data.folderErrors);
        }
        setToast({ message, type: 'success' });
        setSelectedApplications(new Set());
        await fetchApplications();
      } else {
        setToast({ message: data.error || 'Failed to delete applications', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting applications:', error);
      setToast({ message: 'An error occurred while deleting applications', type: 'error' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = async () => {
    const selectedIds = Array.from(selectedApplications);
    if (selectedIds.length === 0) {
      setToast({ message: 'Please select at least one application', type: 'error' });
      return;
    }

    try {
      setIsBulkExporting(true);
      const response = await fetch('/api/applications/bulk-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationIds: selectedIds }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `applications-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setToast({ message: `Successfully exported ${selectedIds.length} application(s)`, type: 'success' });
      } else {
        const data = await response.json();
        setToast({ message: data.error || 'Failed to export applications', type: 'error' });
      }
    } catch (error) {
      console.error('Error exporting applications:', error);
      setToast({ message: 'An error occurred while exporting applications', type: 'error' });
    } finally {
      setIsBulkExporting(false);
    }
  };

  // Import handlers
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
      setImportError(null);
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      setImportError('Please provide JSON data');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(importJson);
    } catch (err) {
      setImportError('Invalid JSON format');
      return;
    }

    if (!Array.isArray(parsedData)) {
      setImportError('JSON must be an array of applications');
      return;
    }

    if (parsedData.length === 0) {
      setImportError('JSON array is empty');
      return;
    }

    // Validate structure
    const validationErrors: string[] = [];
    parsedData.forEach((app: any, index: number) => {
      if (!app.company_info || !app.company_info.name) {
        validationErrors.push(`Application ${index + 1}: Missing company_info.name`);
      }
    });

    if (validationErrors.length > 0) {
      setImportError(`Validation failed:\n${validationErrors.join('\n')}`);
      return;
    }

    if (!importTarget && availableTargets.length > 0) {
      setImportError('Please select a job target');
      return;
    }

    try {
      setIsImporting(true);
      setImportError(null);
      const response = await fetch('/api/applications/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applications: parsedData,
          target: importTarget || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        let message = `Successfully imported ${data.imported} application(s)`;
        if (data.imported < data.total) {
          message += ` out of ${data.total} (some may have been skipped due to duplicates)`;
        }
        setToast({ message, type: 'success' });
        setShowImportModal(false);
        setImportJson('');
        setImportTarget('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await fetchApplications();
      } else {
        const errorMsg = data.error || 'Failed to import applications';
        const details = data.details ? (Array.isArray(data.details) ? data.details.join('\n') : data.details) : '';
        setImportError(details ? `${errorMsg}\n${details}` : errorMsg);
        setToast({ message: errorMsg, type: 'error' });
      }
    } catch (error) {
      console.error('Error importing applications:', error);
      const errorMsg = 'An error occurred while importing applications';
      setImportError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      fresh: 'bg-blue-100 text-blue-800',
      jd_fetched: 'bg-purple-100 text-purple-800',
      jd_analyzed: 'bg-indigo-100 text-indigo-800',
      tailored: 'bg-cyan-100 text-cyan-800',
      rsm_exported: 'bg-teal-100 text-teal-800',
      applied: 'bg-yellow-100 text-yellow-800',
      bid_failed: 'bg-red-100 text-red-800',
      ongoing: 'bg-orange-100 text-orange-800',
      failed: 'bg-gray-100 text-gray-800',
      offer: 'bg-green-100 text-green-800',
      no_interest: 'bg-rose-100 text-rose-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isFilterActive = () => {
    return (
      filters.statuses.length > 0 ||
      filters.easyApply !== 'all' ||
      filters.createdAtFrom ||
      filters.createdAtTo ||
      filters.appliedAtFrom ||
      filters.appliedAtTo
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-1">Track and manage your job applications</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Upload size={20} />
            <span>Import Application</span>
          </button>
          <button 
            onClick={handleDeleteAll}
            disabled={isDeleting || applications.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            title={applications.length === 0 ? 'No data to delete' : 'Delete all applications and rejected URLs'}
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
          <button 
            onClick={handleAddApplication}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Target Tabs and Search */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs by Target */}
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedTab === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({getTabCount('all')})
            </button>
            {availableTargetsFromApps.length > 0 && availableTargetsFromApps.map((target) => (
              <button
                key={target}
                onClick={() => setSelectedTab(target)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedTab === target
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {target} ({getTabCount(target)})
              </button>
            ))}
            {applications.some(app => !app.target) && (
              <button
                onClick={() => setSelectedTab('no-target')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedTab === 'no-target'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No Target ({getTabCount('no-target')})
              </button>
            )}
          </div>

          {/* Expandable Search */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div 
                className={`relative flex items-center overflow-hidden transition-all duration-300 ease-in-out border border-gray-300 rounded-lg ${
                  isSearchExpanded ? 'w-[200px] h-[42px]' : 'w-[42px] h-[42px]'
                }`}
              >
                {/* Search Icon - Always visible */}
                <div className={`absolute left-0 top-0 h-full flex items-center justify-center transition-all duration-300 ${
                  isSearchExpanded ? 'w-9 pointer-events-none' : 'w-full cursor-pointer hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (!isSearchExpanded) {
                    setIsSearchExpanded(true);
                    // Focus the input after the expansion animation
                    requestAnimationFrame(() => {
                      searchInputRef.current?.focus();
                    });
                  }
                }}
                >
                  <Search size={20} className="text-gray-400" />
                </div>
                
                {/* Search Input */}
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onBlur={() => {
                    if (!searchTerm) {
                      setIsSearchExpanded(false);
                    }
                  }}
                  onFocus={() => setIsSearchExpanded(true)}
                  className={`w-full h-full pl-9 pr-3 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-sm transition-opacity duration-200 ${
                    isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
              </div>
              <button
                onClick={() => {
                  setIsFilterDrawerVisible(true);
                  requestAnimationFrame(() => setIsFilterDrawerOpen(true));
                }}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  isFilterActive()
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter size={24} className="text-gray-400" />
                {isFilterActive() && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-indigo-600 text-white rounded-full">
                    {[
                      filters.statuses.length > 0 ? 1 : 0,
                      filters.easyApply !== 'all' ? 1 : 0,
                      filters.createdAtFrom || filters.createdAtTo ? 1 : 0,
                      filters.appliedAtFrom || filters.appliedAtTo ? 1 : 0,
                    ].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected && !isAllSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Applied At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="animate-spin text-indigo-600" size={40} />
                      <p className="text-gray-500">Loading applications...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-2xl">⚠</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Error loading applications</h3>
                      <p className="text-gray-500 max-w-sm">{error}</p>
                      <button
                        onClick={fetchApplications}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="text-gray-400" size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {searchTerm ? 'No matching applications' : 'No applications yet'}
                      </h3>
                      <p className="text-gray-500 max-w-sm">
                        {searchTerm
                          ? 'Try adjusting your search criteria'
                          : 'Start tracking your job applications by importing URLs.'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={handleAddApplication}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Import URLs
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app) => {
                  const similarCompanies = findSimilarCompanies(app, applications);
                  const hasSimilarCompanies = similarCompanies.length > 0;
                  const isSelected = selectedApplications.has(app._id);
                  return (
                  <tr 
                    key={app._id} 
                    onClick={() => router.push(`/dashboard/applications/${app._id}`)}
                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50' : hasSimilarCompanies ? 'bg-rose-50 hover:bg-rose-100' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectApplication(app._id, e.target.checked, e)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <div className="text-sm font-medium text-gray-900">
                          {app.company_info?.name || 'N/A'}
                        </div>
                        {(app.isEasyApply ?? !app.url) && (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 border border-purple-200"
                            title="Easy Apply entry"
                          >
                            <Sparkles size={14} />
                            <span className="sr-only">Easy Apply entry</span>
                          </span>
                        )}
                        {hasSimilarCompanies && (
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
                        )}
                      </div>
                      {app.company_info?.salary && (
                        <div className="text-xs text-gray-500">
                          {app.company_info.salary}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {app.title || 'Not specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          app.status
                        )}`}
                        title={app.statusDescription}
                      >
                        {app.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {app.createdAt ? formatDate(app.createdAt) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {app.appliedAt ? formatDate(app.appliedAt) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {app.url ? (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <span className="max-w-xs truncate">{app.url}</span>
                          <ExternalLink size={14} className="flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No URL provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => handleDeleteApplication(app._id, app.company_info?.name || 'Unknown', e)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete application"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isLoading && !error && filteredApplications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side: Showing X to Y of Z results */}
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{Math.min(endIndex, filteredApplications.length)}</span> of{' '}
              <span className="font-medium">{filteredApplications.length}</span> results
            </div>

            {/* Center: Page navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight size={20} />
              </button>
            </div>

            {/* Right side: Items per page selector */}
            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPage" className="text-sm text-gray-700">
                Per page:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Operations Panel */}
      {selectedApplications.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-700">
              {selectedApplications.size} selected
            </div>
            <button
              onClick={handleBulkExport}
              disabled={isBulkExporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isBulkExporting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Export</span>
                </>
              )}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </>
              )}
            </button>
            <button
              onClick={() => setSelectedApplications(new Set())}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Import Application Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Import Applications</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                  setImportTarget('');
                  setImportError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload JSON File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Or paste JSON directly in the text area below
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JSON Data
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => {
                    setImportJson(e.target.value);
                    setImportError(null);
                  }}
                  className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder='[{"company_info": {"name": "Company Name"}, "title": "Job Title", "link": "https://...", ...}]'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Target
                </label>
                <select
                  value={importTarget}
                  onChange={(e) => setImportTarget(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">No target (optional)</option>
                  {availableTargets.map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a job target for all imported applications
                </p>
              </div>
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 whitespace-pre-line">{importError}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                  setImportTarget('');
                  setImportError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || !importJson.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Import</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Easy Apply Modal */}
      {showEasyApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Easy Apply Application</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  ref={easyApplyFirstInputRef}
                  value={easyApplyForm.companyName}
                  onChange={(e) => {
                    const companyName = e.target.value;
                    setEasyApplyForm({ ...easyApplyForm, companyName });
                    
                    // Check for duplicate company names
                    if (companyName.trim()) {
                      const duplicates = applications.filter(app => 
                        app.company_info?.name && 
                        areCompaniesSimilar(companyName.trim(), app.company_info.name)
                      );
                      
                      if (duplicates.length > 0) {
                        const duplicateNames = duplicates.map(app => app.company_info?.name).filter(Boolean).join(', ');
                        setDuplicateCompanyWarning(`Warning: Similar company name(s) already exist: ${duplicateNames}`);
                      } else {
                        setDuplicateCompanyWarning('');
                      }
                    } else {
                      setDuplicateCompanyWarning('');
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    duplicateCompanyWarning ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter company name"
                  autoFocus
                />
                {duplicateCompanyWarning && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center space-x-1">
                    <AlertTriangle size={14} />
                    <span>{duplicateCompanyWarning}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={easyApplyForm.title}
                  onChange={(e) => setEasyApplyForm({ ...easyApplyForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter job title (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application URL
                </label>
                <input
                  type="url"
                  value={easyApplyForm.url}
                  onChange={(e) => setEasyApplyForm({ ...easyApplyForm, url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://careers.example.com/job (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional — add a link even for Easy Apply entries.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Target *
                </label>
                <select
                  value={easyApplyForm.target}
                  onChange={(e) => setEasyApplyForm({ ...easyApplyForm, target: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={availableTargets.length === 0}
                >
                  <option value="" disabled>
                    {availableTargets.length === 0 ? 'No job targets available' : 'Select job target'}
                  </option>
                  {availableTargets.map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
                {availableTargets.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Required — determines export folder and configurations.
                  </p>
                )}
                {availableTargets.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Configure job targets in Options before creating Easy Apply entries.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEasyApplyModal(false);
                  setEasyApplyForm({ companyName: '', title: '', target: '', url: '' });
                  setDuplicateCompanyWarning('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEasyApply}
                disabled={
                  isCreatingEasyApply ||
                  !easyApplyForm.companyName.trim() ||
                  !easyApplyForm.target.trim()
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreatingEasyApply ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      {isFilterDrawerVisible && (
        <>
          <div
            className={`fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300 ${
              isFilterDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div
            className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
              isFilterDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <p className="text-sm text-gray-500">Refine your applications list</p>
              </div>
              <button
                onClick={() => setFilters(defaultFilterConfig)}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Reset
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gray-50">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
                  Status
                  {filters.statuses.length > 0 && (
                    <span className="text-xs text-gray-500">{filters.statuses.length} selected</span>
                  )}
                </h4>
                {availableStatuses.length === 0 ? (
                  <p className="text-sm text-gray-500">No statuses available.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableStatuses.map((status) => {
                      const isChecked = filters.statuses.includes(status);
                      return (
                        <button
                          key={status}
                          onClick={() =>
                            setFilters((prev) => {
                              const nextStatuses = isChecked
                                ? prev.statuses.filter((s) => s !== status)
                                : [...prev.statuses, status];
                              return { ...prev, statuses: nextStatuses };
                            })
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase transition-all border ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                              : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Easy Apply</h4>
                <div className="grid grid-cols-1 gap-2">
                  {(['all', 'easy', 'non_easy'] as EasyApplyFilter[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilters((prev) => ({ ...prev, easyApply: option }))}
                      className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        filters.easyApply === option
                          ? 'border-indigo-600 text-indigo-600 bg-indigo-50 shadow'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option === 'all'
                        ? 'All applications'
                        : option === 'easy'
                        ? 'Easy Apply only'
                        : 'Exclude Easy Apply'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Created At</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.createdAtFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, createdAtFrom: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.createdAtTo}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, createdAtTo: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Applied At</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.appliedAtFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, appliedAtFrom: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.appliedAtTo}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, appliedAtTo: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

