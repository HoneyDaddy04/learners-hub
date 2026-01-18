import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Library, 
  Users, 
  Calendar, 
  Ticket, 
  Bell, 
  LogOut,
  Menu,
  Book,
  GraduationCap
} from 'lucide-react';
import { User, UserRole, Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  notifications: Notification[];
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  activeTab, 
  onTabChange, 
  onLogout,
  notifications
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check for admin privileges (Super Admin or Admin)
  const isManagement = currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN;
  const unreadCount = notifications.filter(n => !n.read).length;

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        onTabChange(id);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1
        ${activeTab === id 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-800 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">LearnCoord</span>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-6 overflow-y-auto">
            <div className="space-y-1">
              <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Platform
              </div>
              <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem id="assignments" icon={Calendar} label="Assignments" />
              <NavItem id="feed" icon={Ticket} label="Activity Feed" />
              
              <div className="px-4 mt-8 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Activities
              </div>
              <NavItem id="workshops" icon={GraduationCap} label="Workshops & Events" />
              <NavItem id="bookclub" icon={Book} label="Book Club" />
              <NavItem id="resources" icon={Library} label="Resources" />
              
              {isManagement && (
                <>
                  <div className="px-4 mt-8 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Admin
                  </div>
                  <NavItem id="team" icon={Users} label="Team Management" />
                </>
              )}
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="w-9 h-9 rounded-full ring-2 ring-white"
              />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser.role === UserRole.SUPER_ADMIN ? 'Super Admin' : 
                   currentUser.role === UserRole.ADMIN ? 'Administrator' : 'Staff'}
                </p>
              </div>
              <button 
                onClick={onLogout}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-sm text-gray-500 mt-1">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-2">{n.date}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;