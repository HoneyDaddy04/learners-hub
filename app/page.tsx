'use client';

import React, { useState } from 'react';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import Assignments from '../components/Assignments';
import ActivityFeed from '../components/ActivityFeed';
import Resources from '../components/Resources';
import TeamView from '../components/TeamView';
import BookClub from '../components/BookClub';
import Workshops from '../components/Workshops';
import SignIn from '../components/SignIn';
import { StoreProvider, useStore } from '../contexts/StoreContext';
import { UserRole } from '../types';

// Separate component for internal content to use the hook
const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentUser, switchUser, notifications, isAuthenticated, logout } = useStore();

  const handleLogout = () => {
    logout();
  };

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
      case UserRole.SUPER_ADMIN: return 'Super Admin';
      case UserRole.ADMIN: return 'Admin';
      case UserRole.STAFF: return 'Staff';
      default: return 'User';
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'assignments':
        return <Assignments />;
      case 'feed':
        return <ActivityFeed activities={[]} />;
      case 'resources':
        return <Resources />;
      case 'team':
        return <TeamView />;
      case 'bookclub':
        return <BookClub />;
      case 'workshops':
        return <Workshops />;
      default:
        return <div>Not found</div>;
    }
  };

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <div className="relative">
      {/* Demo Control - Floating Button to switch roles */}
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          onClick={switchUser}
          className="bg-gray-800 text-white px-4 py-3 rounded-full shadow-lg hover:bg-gray-700 font-medium text-sm flex items-center"
        >
          Switch Role: {getRoleLabel(currentUser.role)}
        </button>
      </div>

      <Layout 
        currentUser={currentUser} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        notifications={notifications}
      >
        {renderContent()}
      </Layout>
    </div>
  );
};

// Main Page Component
export default function Page() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}