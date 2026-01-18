import React from 'react';
import { 
  BookOpen, 
  CheckSquare, 
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { UserRole } from '../types';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, assignments, activities, resources } = useStore();
  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  // Data Logic
  const myAssignments = assignments.filter(a => a.assignedTo === currentUser.id && a.status !== 'Completed');
  const completedAssignments = assignments.filter(a => a.assignedTo === currentUser.id && a.status === 'Completed');
  const recentActivity = activities.slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-gray-700 opacity-75" />
        </div>
      </div>
      {subtext && <p className="text-sm text-gray-400 mt-4">{subtext}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin 
              ? "Here's what's happening across the organization." 
              : "Here's your learning progress for this quarter."}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title={isAdmin ? "Total Staff" : "Active Assignments"}
          value={isAdmin ? "4" : myAssignments.length.toString()}
          icon={BookOpen}
          color="bg-blue-100"
          subtext={isAdmin ? "Across 3 departments" : "Due this quarter"}
        />
        <StatCard 
          title={isAdmin ? "Pending Assignments" : "Activities Completed"}
          value={isAdmin ? assignments.filter(a => a.status !== 'Completed').length.toString() : (completedAssignments.length + 12).toString()} 
          icon={CheckSquare}
          color="bg-amber-100"
          subtext={isAdmin ? "Total assigned tasks" : "Lifetime completion"}
        />
        <StatCard 
          title="Shared Resources"
          value={resources.filter(s => s.isOfficial).length.toString()}
          icon={TrendingUp}
          color="bg-green-100"
          subtext="Available for rotation"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {isAdmin ? "Recent Assignments" : "Priority Tasks"}
              </h3>
              <button 
                onClick={() => onNavigate('assignments')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {(isAdmin ? assignments.slice(0, 3) : myAssignments.slice(0, 3)).length > 0 ? 
                (isAdmin ? assignments.slice(0, 3) : myAssignments.slice(0, 3)).map(assignment => (
                <div key={assignment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className={`mt-1 p-1.5 rounded-full ${assignment.type === 'Course' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {assignment.type === 'Course' ? <BookOpen className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-base font-semibold text-gray-900">{assignment.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">Source: {assignment.sourceName}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Due: {assignment.dueDate}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-500">
                  No active items found.
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
             <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
             </div>
             <div className="divide-y divide-gray-100">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="p-4 flex items-start">
                    <img 
                      src={activity.userAvatar} 
                      alt="" 
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{activity.userName}</span>
                        {' '}{activity.action}{' '}
                        <span className="font-medium text-blue-600">{activity.target}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <button 
                  onClick={() => onNavigate('feed')}
                  className="text-sm text-gray-600 font-medium hover:text-gray-900 flex items-center justify-center w-full"
                >
                  View Full Feed <ArrowRight className="w-4 h-4 ml-1" />
                </button>
             </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
           {/* Available Pools Quick View */}
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h3>
              <div className="space-y-4">
                {resources.slice(0, 3).map(source => (
                  <div key={source.id} className="group cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                        {source.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => onNavigate('resources')}
                className="mt-6 w-full py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Browse Catalog
              </button>
           </div>
           
           {/* Upcoming Events */}
           <div 
              onClick={() => onNavigate('bookclub')}
              className="bg-blue-900 rounded-xl shadow-sm p-6 text-white relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-4">Book Club</h3>
                <div className="mb-4">
                  <span className="inline-block px-2 py-1 bg-blue-800 rounded text-xs font-medium mb-2">Next Session</span>
                  <p className="font-semibold text-lg">Designing Data-Intensive Applications</p>
                  <p className="text-blue-200 text-sm mt-1">Friday, 3:00 PM EST</p>
                </div>
                <button className="w-full py-2 bg-white text-blue-900 rounded-lg text-sm font-bold hover:bg-blue-50">
                  View Details
                </button>
              </div>
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-800 rounded-full opacity-50 blur-2xl"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;