import React, { useState } from 'react';
import { ExternalLink, CheckCircle, Plus, Trash2, Users, Key, X } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { UserRole, Resource } from '../types';

const Resources: React.FC = () => {
  const { resources, currentUser, users, toolAllocations, addResource, removeResource, assignTool, revokeTool } = useStore();
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // Forms state
  const [newResource, setNewResource] = useState<Partial<Resource>>({ name: '', description: '', url: '', logoUrl: '', isOfficial: true });
  const [assignUserId, setAssignUserId] = useState('');

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (newResource.name && newResource.url) {
      addResource({
        name: newResource.name!,
        description: newResource.description || '',
        url: newResource.url!,
        logoUrl: newResource.logoUrl || 'https://via.placeholder.com/100',
        isOfficial: newResource.isOfficial || false
      });
      setIsAddModalOpen(false);
      setNewResource({ name: '', description: '', url: '', logoUrl: '', isOfficial: true });
    }
  };

  const handleAssignTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedResourceId && assignUserId) {
      assignTool(selectedResourceId, assignUserId);
      setIsAssignModalOpen(false);
      setAssignUserId('');
    }
  };

  const getActiveUsersForResource = (resourceId: string) => {
    return toolAllocations
      .filter(ta => ta.resourceId === resourceId && ta.status === 'Active')
      .map(ta => {
        const user = users.find(u => u.id === ta.userId);
        return { user, allocationId: ta.id };
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources & Tools</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin 
              ? "Manage available tools and user access rights." 
              : "Access approved learning platforms and tools."}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tool
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(resource => {
          const activeUsers = getActiveUsersForResource(resource.id);
          
          return (
            <div key={resource.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col p-6">
              <div className="flex items-start justify-between mb-4">
                 <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-lg p-2 flex items-center justify-center">
                   <img src={resource.logoUrl} alt={resource.name} className="max-h-full max-w-full" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerText = resource.name[0];
                   }} />
                 </div>
                 <div className="flex space-x-2">
                   {resource.isOfficial && (
                     <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> Official
                     </span>
                   )}
                   {isAdmin && (
                     <button 
                       onClick={() => { if(window.confirm('Delete this resource?')) removeResource(resource.id); }}
                       className="p-1 text-gray-400 hover:text-red-500"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                 </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">{resource.name}</h3>
              <p className="text-sm text-gray-500 mb-4 flex-1">{resource.description}</p>
              
              {/* Active Users Section for Admin */}
              {isAdmin && (
                <div className="mb-4 bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Active Users ({activeUsers.length})</span>
                    <button 
                      onClick={() => { setSelectedResourceId(resource.id); setIsAssignModalOpen(true); }}
                      className="text-xs text-blue-600 font-medium hover:text-blue-800 flex items-center"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Assign
                    </button>
                  </div>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {activeUsers.length > 0 ? activeUsers.map(({ user, allocationId }) => (
                      <div key={allocationId} className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-800 font-bold mr-2">
                            {user?.name.charAt(0)}
                          </div>
                          <span className="truncate max-w-[100px]">{user?.name}</span>
                        </div>
                        <button 
                          onClick={() => revokeTool(allocationId)}
                          className="text-gray-400 hover:text-red-500" title="Revoke Access"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400 italic">No active users</p>
                    )}
                  </div>
                </div>
              )}

              <a 
                href={resource.url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors mt-auto"
              >
                Open Platform <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>
          );
        })}
      </div>

      {/* Add Resource Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Tool</h3>
            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
                 <input required type="text" className="w-full border rounded-lg p-2" value={newResource.name} onChange={e => setNewResource({...newResource, name: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                 <textarea className="w-full border rounded-lg p-2" rows={2} value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                 <input required type="url" className="w-full border rounded-lg p-2" value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (Optional)</label>
                 <input type="text" className="w-full border rounded-lg p-2" value={newResource.logoUrl} onChange={e => setNewResource({...newResource, logoUrl: e.target.value})} />
              </div>
              <div className="flex items-center">
                 <input type="checkbox" id="official" className="mr-2" checked={newResource.isOfficial} onChange={e => setNewResource({...newResource, isOfficial: e.target.checked})} />
                 <label htmlFor="official" className="text-sm text-gray-700">Mark as Official/Approved</label>
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4">Add Tool</button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Tool Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-sm w-full relative">
            <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Assign Access</h3>
            <p className="text-sm text-gray-500 mb-4">Select a user to grant access to this tool.</p>
            <form onSubmit={handleAssignTool} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                 <select 
                   required
                   className="w-full border rounded-lg p-2"
                   value={assignUserId}
                   onChange={e => setAssignUserId(e.target.value)}
                 >
                   <option value="">Select User...</option>
                   {users.map(u => (
                     <option key={u.id} value={u.id}>{u.name}</option>
                   ))}
                 </select>
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4">Grant Access</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;