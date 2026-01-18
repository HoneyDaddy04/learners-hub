import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { Mail, Shield, Trash2, UserPlus, MoreHorizontal, Download, X, User as UserIcon, Calendar, BookOpen, PenTool } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';

const TeamView: React.FC = () => {
  const { users, currentUser, removeUser, addUser, assignments, toolAllocations, resources } = useStore();
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form State
  const [newUser, setNewUser] = useState({ name: '', email: '', department: '', role: UserRole.STAFF, managerId: '' });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      ...newUser,
      avatarUrl: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
    });
    setIsAddModalOpen(false);
    setNewUser({ name: '', email: '', department: '', role: UserRole.STAFF, managerId: '' });
  };

  const getUserDetails = (userId: string) => {
    const userAssignments = assignments.filter(a => a.assignedTo === userId);
    const userAllocations = toolAllocations.filter(ta => ta.userId === userId).map(ta => ({
        ...ta,
        resourceName: resources.find(r => r.id === ta.resourceId)?.name || 'Unknown Tool'
    }));
    return { userAssignments, userAllocations };
  };

  const ProfileModal = ({ user, onClose }: { user: User, onClose: () => void }) => {
    const { userAssignments, userAllocations } = getUserDetails(user.id);
    const manager = users.find(u => u.id === user.managerId);

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
           <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div className="flex items-center">
                 <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full ring-4 ring-gray-50" />
                 <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-gray-500">{user.department} • {user.email}</p>
                 </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
           </div>
           
           <div className="p-6 space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Role</p>
                    <p className="font-medium text-gray-900">{user.role}</p>
                 </div>
                 <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Manager</p>
                    <p className="font-medium text-gray-900">{manager ? manager.name : 'None'}</p>
                 </div>
              </div>

              {/* Tool History */}
              <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <PenTool className="w-5 h-5 mr-2 text-blue-600" /> Tool Access History
                 </h3>
                 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {userAllocations.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {userAllocations.map(ua => (
                            <tr key={ua.id}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{ua.resourceName}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{ua.startDate}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{ua.endDate || '-'}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  ua.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {ua.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-sm text-gray-500 italic">No tool history found.</div>
                    )}
                 </div>
              </div>

              {/* Assignment History */}
              <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" /> Learning Plan & History
                 </h3>
                 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {userAssignments.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {userAssignments.map(a => (
                            <tr key={a.id}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.title}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{a.type}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{a.dueDate}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  a.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                  a.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-sm text-gray-500 italic">No assignments found.</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team & Organization</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin 
              ? "Manage employee access, assignments, and reporting lines." 
              : "View your colleagues and reporting structure."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex space-x-3 mt-4 sm:mt-0">
             <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm font-medium">
               <Download className="w-4 h-4 mr-2" />
               Import CSV
             </button>
             <button 
               onClick={() => setIsAddModalOpen(true)}
               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium shadow-sm"
             >
               <UserPlus className="w-4 h-4 mr-2" />
               Add Member
             </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
           <div className="relative max-w-xs w-full">
             <input
               type="text"
               placeholder="Find a team member..."
               className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="text-sm text-gray-500">
             Showing {filteredUsers.length} members
           </div>
        </div>

        <ul className="divide-y divide-gray-200">
          {filteredUsers.map(user => (
            <li key={user.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedUser(user)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <img className="h-10 w-10 rounded-full ring-2 ring-white" src={user.avatarUrl} alt="" />
                  <div className="ml-4">
                    <div className="flex items-center">
                       <h3 className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">{user.name}</h3>
                       {user.role === UserRole.ADMIN && (
                         <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                           Admin
                         </span>
                       )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{user.email}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span>{user.department}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                   {isAdmin ? (
                     <>
                       <div className="text-right hidden sm:block">
                         <p className="text-xs text-gray-500">Status</p>
                         <div className="flex items-center">
                            <span className="h-2 w-2 bg-green-400 rounded-full mr-1.5"></span>
                            <span className="text-sm font-medium text-gray-900">Active</span>
                         </div>
                       </div>
                       <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                         <button 
                           onClick={() => removeUser(user.id)}
                           className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50" title="Remove Access"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </>
                   ) : (
                     <MoreHorizontal className="w-5 h-5 text-gray-400" />
                   )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add Team Member</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                 <input 
                    required 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                 <input 
                    required 
                    type="email" 
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                 <input 
                    required 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={newUser.department}
                    onChange={e => setNewUser({...newUser, department: e.target.value})}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                 <select
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                 >
                   <option value={UserRole.STAFF}>Staff</option>
                   <option value={UserRole.ADMIN}>Admin</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                 <select
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={newUser.managerId}
                    onChange={e => setNewUser({...newUser, managerId: e.target.value})}
                 >
                    <option value="">No Manager</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                 </select>
              </div>
              <button 
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4"
              >
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <ProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};

export default TeamView;