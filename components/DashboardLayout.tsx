'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Download,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  Settings,
  FileCheck,
  FileEdit
} from 'lucide-react';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const allMenuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'URL Management', path: '/dashboard/import-urls', icon: Upload },
  { name: 'My Applications', path: '/dashboard/applications', icon: FileText },
  { name: 'Options', path: '/dashboard/options', icon: Settings },
  { name: 'User Management', path: '/dashboard/users', icon: Users },
  { name: 'Export Resume', path: '/dashboard/export', icon: Download },
  { name: 'AI Integration Test', path: '/dashboard/ai-test', icon: Sparkles },
  { name: 'Resume/Cover Letter', path: '/dashboard/resume-build-test', icon: FileEdit },
];

// Menu items that are restricted to admin only
const adminOnlyPaths = [
  '/dashboard/users',
  '/dashboard/ai-test',
  '/dashboard/resume-build-test',
  '/dashboard/export',
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  // Filter menu items based on user role
  // Admins see all sections, regular users only see non-admin sections
  const isAdmin = session?.user?.role === 'admin';
  const menuItems = allMenuItems.filter((item) => {
    // If user is admin, show all items
    if (isAdmin) {
      return true;
    }
    // If user is not admin, hide admin-only pages
    if (adminOnlyPaths.includes(item.path)) {
      return false;
    }
    // Show all other pages to regular users
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          ${isExpanded ? 'w-64' : 'w-20'}
          bg-white shadow-lg transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {isExpanded && (
              <h1 className="text-2xl font-bold text-indigo-900">F&F</h1>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-2 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-3 rounded-lg
                      transition-colors duration-200
                      ${isActive 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {isExpanded && (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User Profile & Logout */}
          <div className="border-t p-4">
            <div className={`flex items-center ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                {session?.user?.name?.charAt(0) || 'A'}
              </div>
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className={`
                mt-3 w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                text-red-600 hover:bg-red-50 transition-colors duration-200
                ${!isExpanded && 'justify-center'}
              `}
            >
              <LogOut size={20} />
              {isExpanded && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}

