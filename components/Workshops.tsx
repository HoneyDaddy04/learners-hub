import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { UserRole, Workshop } from '../types';
import { Video, FileText, CheckCircle, ChevronDown, ChevronUp, Plus, MapPin, Monitor, Trash2, Calendar, X, Clock } from 'lucide-react';

const Workshops: React.FC = () => {
  const { workshops, currentUser, users, assignments, gradeAssignment, addWorkshop, deleteWorkshop } = useStore();
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Grading State
  const [expandedWorkshopId, setExpandedWorkshopId] = useState<string | null>(null);
  const [gradingForm, setGradingForm] = useState<{ [key: string]: { grade: string, feedback: string } }>({});
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState<Partial<Workshop>>({
    title: '',
    date: '',
    instructor: '',
    description: '',
    type: 'In-Person',
    location: '',
    meetingUrl: '',
    recordingUrl: '',
    materialsUrl: ''
  });

  const toggleExpand = (id: string) => {
    setExpandedWorkshopId(expandedWorkshopId === id ? null : id);
  };

  const handleGradeChange = (assignmentId: string, field: 'grade' | 'feedback', value: string) => {
    setGradingForm(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value
      }
    }));
  };

  const submitGrade = (assignmentId: string) => {
    const data = gradingForm[assignmentId];
    if (data) {
      gradeAssignment(assignmentId, data.grade, data.feedback);
      alert('Grade saved!');
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkshop.title && newWorkshop.date) {
      addWorkshop({
        title: newWorkshop.title!,
        date: newWorkshop.date!,
        instructor: newWorkshop.instructor || 'TBD',
        description: newWorkshop.description || '',
        type: newWorkshop.type as 'In-Person' | 'Virtual',
        location: newWorkshop.location,
        meetingUrl: newWorkshop.meetingUrl,
        recordingUrl: newWorkshop.recordingUrl,
        materialsUrl: newWorkshop.materialsUrl,
        attendees: []
      });
      setIsModalOpen(false);
      setNewWorkshop({
        title: '', date: '', instructor: '', description: '', type: 'In-Person', location: '', meetingUrl: '', recordingUrl: '', materialsUrl: ''
      });
    }
  };

  const getWorkshopAssignments = (workshopTitle: string) => {
    return assignments.filter(a => a.title === workshopTitle);
  };

  // Filter Workshops
  const now = new Date();
  const sortedWorkshops = [...workshops].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const upcomingWorkshops = sortedWorkshops.filter(w => new Date(w.date) >= now);
  const pastWorkshops = sortedWorkshops.filter(w => new Date(w.date) < now).reverse();

  const displayedWorkshops = activeTab === 'upcoming' ? upcomingWorkshops : pastWorkshops;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshops & Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? "Manage events, schedule sessions, and grade participants." : "View upcoming events and access past materials."}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
         <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upcoming' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
         >
           Upcoming ({upcomingWorkshops.length})
         </button>
         <button
            onClick={() => setActiveTab('past')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'past' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
         >
           Past Events ({pastWorkshops.length})
         </button>
      </div>

      <div className="space-y-4">
        {displayedWorkshops.length > 0 ? displayedWorkshops.map(workshop => {
           const linkedAssignments = getWorkshopAssignments(workshop.title);
           
           return (
             <div key={workshop.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="p-6">
                  <div className="flex justify-between items-start">
                     <div className="flex-1">
                        <div className="flex items-center mb-1">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2
                             ${workshop.type === 'In-Person' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}`}>
                              {workshop.type}
                           </span>
                           <span className="text-sm text-gray-500 flex items-center">
                             <Calendar className="w-3.5 h-3.5 mr-1" /> {workshop.date}
                           </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{workshop.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">Instructor: {workshop.instructor}</p>
                        
                        {/* Location Details */}
                        <div className="mt-2 text-sm text-gray-700 flex items-center">
                           {workshop.type === 'In-Person' ? (
                             <><MapPin className="w-4 h-4 mr-1.5 text-gray-400" /> {workshop.location || 'Location TBD'}</>
                           ) : (
                             <><Monitor className="w-4 h-4 mr-1.5 text-gray-400" /> 
                               {workshop.meetingUrl ? (
                                 <a href={workshop.meetingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                   Join Meeting
                                 </a>
                               ) : 'Link TBD'}
                             </>
                           )}
                        </div>

                        <p className="text-gray-600 mt-3 text-sm">{workshop.description}</p>
                     </div>

                     <div className="flex flex-col space-y-2 ml-4">
                        {workshop.recordingUrl && (
                           <a href={workshop.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 whitespace-nowrap">
                             <Video className="w-3 h-3 mr-1.5" /> Recording
                           </a>
                        )}
                        {workshop.materialsUrl && (
                           <a href={workshop.materialsUrl} target="_blank" rel="noreferrer" className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 whitespace-nowrap">
                             <FileText className="w-3 h-3 mr-1.5" /> Slides
                           </a>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              if(window.confirm('Are you sure you want to delete this event?')) {
                                deleteWorkshop(workshop.id);
                              }
                            }}
                            className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 whitespace-nowrap"
                          >
                            <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                          </button>
                        )}
                     </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                       <button 
                         onClick={() => toggleExpand(workshop.id)}
                         className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                       >
                         {expandedWorkshopId === workshop.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                         Manage Grades ({linkedAssignments.length} Participants)
                       </button>

                       {expandedWorkshopId === workshop.id && (
                         <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-4">
                            {linkedAssignments.length > 0 ? linkedAssignments.map(assignment => {
                              const user = users.find(u => u.id === assignment.assignedTo);
                              const isGraded = !!assignment.grade;
                              return (
                                <div key={assignment.id} className="bg-white p-4 rounded border border-gray-200 flex flex-col sm:flex-row gap-4">
                                   <div className="flex items-center w-48">
                                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs mr-3">
                                         {user?.name.charAt(0)}
                                      </div>
                                      <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                                   </div>
                                   
                                   <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {isGraded ? (
                                        <div className="text-sm">
                                           <p className="font-semibold text-green-700 flex items-center">
                                              <CheckCircle className="w-3 h-3 mr-1" /> Graded: {assignment.grade}
                                           </p>
                                           <p className="text-gray-500 italic mt-1">"{assignment.feedback}"</p>
                                        </div>
                                      ) : (
                                        <>
                                          <input 
                                             type="text" 
                                             placeholder="Grade (e.g. Pass, A)" 
                                             className="border border-gray-300 rounded px-2 py-1 text-sm"
                                             onChange={e => handleGradeChange(assignment.id, 'grade', e.target.value)}
                                          />
                                          <input 
                                             type="text" 
                                             placeholder="Feedback..." 
                                             className="border border-gray-300 rounded px-2 py-1 text-sm"
                                             onChange={e => handleGradeChange(assignment.id, 'feedback', e.target.value)}
                                          />
                                        </>
                                      )}
                                   </div>

                                   {!isGraded && (
                                     <button 
                                        onClick={() => submitGrade(assignment.id)}
                                        className="px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 h-8 self-center"
                                     >
                                        Save
                                     </button>
                                   )}
                                </div>
                              );
                            }) : (
                              <p className="text-sm text-gray-500">No active assignments found linked to this workshop.</p>
                            )}
                         </div>
                       )}
                    </div>
                  )}
               </div>
             </div>
           );
        }) : (
            <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-100">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No {activeTab} events</h3>
                <p className="text-gray-500 text-sm mt-1">Check back later or schedule a new one.</p>
            </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-xl shadow-xl p-8 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Schedule New Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input required type="text" className="w-full border rounded-lg p-2" value={newWorkshop.title} onChange={e => setNewWorkshop({...newWorkshop, title: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input required type="date" className="w-full border rounded-lg p-2" value={newWorkshop.date} onChange={e => setNewWorkshop({...newWorkshop, date: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={newWorkshop.instructor} onChange={e => setNewWorkshop({...newWorkshop, instructor: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select className="w-full border rounded-lg p-2" value={newWorkshop.type} onChange={e => setNewWorkshop({...newWorkshop, type: e.target.value as any})}>
                      <option value="In-Person">In-Person</option>
                      <option value="Virtual">Virtual</option>
                    </select>
                 </div>
              </div>

              {newWorkshop.type === 'In-Person' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (Room/Address)</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={newWorkshop.location} onChange={e => setNewWorkshop({...newWorkshop, location: e.target.value})} />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link (Google Meet/Zoom)</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={newWorkshop.meetingUrl} onChange={e => setNewWorkshop({...newWorkshop, meetingUrl: e.target.value})} />
                </div>
              )}

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                 <textarea className="w-full border rounded-lg p-2" rows={3} value={newWorkshop.description} onChange={e => setNewWorkshop({...newWorkshop, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slides URL (Optional)</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={newWorkshop.materialsUrl} onChange={e => setNewWorkshop({...newWorkshop, materialsUrl: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recording URL (Optional)</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={newWorkshop.recordingUrl} onChange={e => setNewWorkshop({...newWorkshop, recordingUrl: e.target.value})} />
                 </div>
              </div>

              <div className="mt-6">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workshops;