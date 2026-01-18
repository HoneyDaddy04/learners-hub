import React, { useState } from 'react';
import { 
  Plus, Search, Filter, CheckCircle, Circle, Clock, MoreVertical, X, Save 
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { UserRole, Assignment } from '../types';

const Assignments: React.FC = () => {
  const { 
    currentUser, assignments, users, resources, 
    addAssignment, updateAssignmentStatus 
  } = useStore();
  
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Completed'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    type: 'Course' as const,
    assignedTo: '',
    dueDate: '',
    sourceName: 'Talstack'
  });

  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  const relevantAssignments = isAdmin 
    ? assignments 
    : assignments.filter(a => a.assignedTo === currentUser.id);

  const filteredAssignments = relevantAssignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' 
      ? true 
      : filterStatus === 'Active' 
        ? a.status !== 'Completed' 
        : a.status === 'Completed';
    return matchesSearch && matchesStatus;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.assignedTo) return;
    
    addAssignment({
      ...newAssignment,
      assignedBy: currentUser.name,
      status: 'Not Started'
    });
    setIsModalOpen(false);
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  // Three dots menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleStatus = (assignment: Assignment) => {
    const nextStatus = assignment.status === 'Completed' ? 'In Progress' : 'Completed';
    updateAssignmentStatus(assignment.id, nextStatus);
    setOpenMenuId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin 
              ? "Manage and track learning tasks across the organization." 
              : "Track your required learning and personal goals."}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
           {['All', 'Active', 'Completed'].map((status) => (
             <button
               key={status}
               onClick={() => setFilterStatus(status as any)}
               className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
                 ${filterStatus === status 
                   ? 'bg-gray-900 text-white' 
                   : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                 }`}
             >
               {status}
             </button>
           ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex-1">Task</div>
            <div className="w-40 hidden sm:block">Source</div>
            {isAdmin && <div className="w-40 hidden sm:block">Assigned To</div>}
            <div className="w-32">Due Date</div>
            <div className="w-32">Status</div>
            <div className="w-10"></div>
          </div>
          
          <div className="divide-y divide-gray-200 bg-white">
            {filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors relative">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center">
                       {assignment.status === 'Completed' ? (
                         <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                       ) : (
                         <Circle className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                       )}
                       <div>
                         <p className={`text-sm font-medium truncate ${assignment.status === 'Completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                           {assignment.title}
                         </p>
                         <div className="sm:hidden text-xs text-gray-500 mt-0.5">{assignment.sourceName}</div>
                         {assignment.grade && (
                            <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Grade: {assignment.grade}
                            </span>
                         )}
                       </div>
                    </div>
                  </div>
                  
                  <div className="w-40 hidden sm:block text-sm text-gray-500">
                    {assignment.sourceName}
                  </div>

                  {isAdmin && (
                    <div className="w-40 hidden sm:block text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs mr-2">
                           {getUserName(assignment.assignedTo).charAt(0)}
                        </div>
                        <span className="truncate">{getUserName(assignment.assignedTo)}</span>
                      </div>
                    </div>
                  )}

                  <div className="w-32 text-sm text-gray-500 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                    {assignment.dueDate}
                  </div>

                  <div className="w-32">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${assignment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="w-10 text-right relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === assignment.id ? null : assignment.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {/* Context Menu */}
                    {openMenuId === assignment.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <button 
                             onClick={() => toggleStatus(assignment)}
                             className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Mark as {assignment.status === 'Completed' ? 'In Progress' : 'Completed'}
                          </button>
                          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            View Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500 text-sm">No assignments found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New Assignment</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newAssignment.title}
                    onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                  />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                   <select 
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newAssignment.assignedTo}
                      onChange={e => setNewAssignment({...newAssignment, assignedTo: e.target.value})}
                   >
                     <option value="">Select Staff...</option>
                     {users.filter(u => u.role === UserRole.STAFF).map(u => (
                       <option key={u.id} value={u.id}>{u.name}</option>
                     ))}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <select 
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         value={newAssignment.sourceName}
                         onChange={e => setNewAssignment({...newAssignment, sourceName: e.target.value})}
                      >
                        <option value="Talstack">Talstack</option>
                        <option value="Coursera">Coursera</option>
                        <option value="Internal">Internal</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select 
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         value={newAssignment.type}
                         onChange={e => setNewAssignment({...newAssignment, type: e.target.value as any})}
                      >
                        <option value="Course">Course</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Reading">Reading</option>
                      </select>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newAssignment.dueDate}
                    onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-8">
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;