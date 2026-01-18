'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  User, UserRole, Resource, Assignment, ActivityLog, 
  Notification, Book, Workshop, ToolAllocation 
} from '../types';
import { 
  MOCK_USERS, MOCK_RESOURCES, MOCK_ASSIGNMENTS, 
  MOCK_ACTIVITY, MOCK_NOTIFICATIONS, MOCK_TOOL_ALLOCATIONS 
} from '../services/mockData';

// Mock Books
const MOCK_BOOKS: Book[] = [
  {
    id: 'b1',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    coverUrl: 'https://m.media-amazon.com/images/I/91rr3B9jERL._AC_UF1000,1000_QL80_.jpg',
    discussionDate: '2023-11-25',
    location: 'Main Conference Room',
    description: 'The big ideas behind reliable, scalable, and maintainable systems.',
    status: 'Current'
  },
  {
    id: 'b2',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverUrl: 'https://m.media-amazon.com/images/I/81F90H7hnML._AC_UF1000,1000_QL80_.jpg',
    discussionDate: '2023-10-15',
    status: 'Archived',
    description: 'An easy & proven way to build good habits & break bad ones.'
  }
];

// Mock Workshops
const MOCK_WORKSHOPS: Workshop[] = [
  {
    id: 'w1',
    title: 'Q4 Leadership Workshop',
    date: '2023-11-20',
    instructor: 'External Consultant',
    description: 'Developing core leadership skills for new managers.',
    type: 'In-Person',
    location: 'Room 304',
    attendees: ['u2', 'u3'],
    materialsUrl: 'https://example.com/slides'
  },
  {
    id: 'w2',
    title: 'Advanced React Patterns',
    date: '2023-09-10',
    instructor: 'Senior Engineer',
    description: 'Deep dive into hooks and performance.',
    type: 'Virtual',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    attendees: ['u2'],
    recordingUrl: 'https://example.com/video'
  }
];

interface StoreContextType {
  isAuthenticated: boolean;
  currentUser: User;
  users: User[];
  resources: Resource[];
  toolAllocations: ToolAllocation[];
  assignments: Assignment[];
  activities: ActivityLog[];
  notifications: Notification[];
  books: Book[];
  workshops: Workshop[];

  // Auth Actions
  login: (email?: string, password?: string) => void;
  logout: () => void;
  switchUser: () => void;

  // Data Actions
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  updateAssignmentStatus: (id: string, status: Assignment['status']) => void;
  gradeAssignment: (id: string, grade: string, feedback: string) => void;
  
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (userId: string) => void;
  
  addResource: (resource: Omit<Resource, 'id'>) => void;
  removeResource: (id: string) => void;
  
  // Tool Allocation Actions
  assignTool: (resourceId: string, userId: string) => void;
  revokeTool: (allocationId: string) => void;

  addWorkshop: (workshop: Omit<Workshop, 'id'>) => void;
  deleteWorkshop: (id: string) => void;
  
  addBook: (book: Omit<Book, 'id'>) => void;
  deleteBook: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
  const [toolAllocations, setToolAllocations] = useState<ToolAllocation[]>(MOCK_TOOL_ALLOCATIONS);
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);
  const [activities, setActivities] = useState<ActivityLog[]>(MOCK_ACTIVITY);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [books, setBooks] = useState<Book[]>(MOCK_BOOKS);
  const [workshops, setWorkshops] = useState<Workshop[]>(MOCK_WORKSHOPS);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const switchUser = () => {
    // Rotation: Super Admin -> Admin -> Staff -> Super Admin
    setCurrentUser(prev => {
      if (prev.role === UserRole.SUPER_ADMIN) return MOCK_USERS[1]; // Admin
      if (prev.role === UserRole.ADMIN) return MOCK_USERS[2]; // Staff
      return MOCK_USERS[0]; // Super Admin
    });
  };

  const addAssignment = (data: Omit<Assignment, 'id'>) => {
    const newAssignment = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setAssignments([newAssignment, ...assignments]);
    
    // Log activity
    const assignee = users.find(u => u.id === data.assignedTo);
    const log: ActivityLog = {
      id: Math.random().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      action: 'assigned',
      target: `${data.title} to ${assignee?.name}`,
      timestamp: 'Just now',
      type: 'assignment'
    };
    setActivities([log, ...activities]);
  };

  const updateAssignmentStatus = (id: string, status: Assignment['status']) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const gradeAssignment = (id: string, grade: string, feedback: string) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, grade, feedback } : a));
    
    const task = assignments.find(a => a.id === id);
    const log: ActivityLog = {
      id: Math.random().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      action: 'graded',
      target: task?.title || 'Assignment',
      timestamp: 'Just now',
      type: 'grade'
    };
    setActivities([log, ...activities]);
  };

  const addUser = (data: Omit<User, 'id'>) => {
    const newUser = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setUsers([...users, newUser]);
  };

  const removeUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const addResource = (data: Omit<Resource, 'id'>) => {
    const newResource = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setResources([...resources, newResource]);
  };

  const removeResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const assignTool = (resourceId: string, userId: string) => {
    const newAllocation: ToolAllocation = {
      id: Math.random().toString(36).substr(2, 9),
      resourceId,
      userId,
      assignedBy: currentUser.name,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    };
    setToolAllocations([newAllocation, ...toolAllocations]);
    
    const resource = resources.find(r => r.id === resourceId);
    const user = users.find(u => u.id === userId);
    
    const log: ActivityLog = {
      id: Math.random().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      action: 'assigned tool',
      target: `${resource?.name} to ${user?.name}`,
      timestamp: 'Just now',
      type: 'tool_allocation'
    };
    setActivities([log, ...activities]);
  };

  const revokeTool = (allocationId: string) => {
    setToolAllocations(prev => prev.map(a => 
      a.id === allocationId 
        ? { ...a, status: 'Returned', endDate: new Date().toISOString().split('T')[0] } 
        : a
    ));
  };

  const addWorkshop = (data: Omit<Workshop, 'id'>) => {
    const newWorkshop = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setWorkshops([newWorkshop, ...workshops]);
    
    const log: ActivityLog = {
      id: Math.random().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      action: 'scheduled event',
      target: data.title,
      timestamp: 'Just now',
      type: 'create'
    };
    setActivities([log, ...activities]);
  };

  const deleteWorkshop = (id: string) => {
    setWorkshops(prev => prev.filter(w => w.id !== id));
  };

  const addBook = (data: Omit<Book, 'id'>) => {
    const newBook = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setBooks([newBook, ...books]);
    
    const log: ActivityLog = {
      id: Math.random().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      action: 'added book',
      target: data.title,
      timestamp: 'Just now',
      type: 'create'
    };
    setActivities([log, ...activities]);
  };

  const deleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <StoreContext.Provider value={{
      isAuthenticated, login, logout,
      currentUser, users, resources, toolAllocations, assignments, activities, notifications, books, workshops,
      switchUser, addAssignment, updateAssignmentStatus, gradeAssignment,
      addUser, removeUser, addResource, removeResource, assignTool, revokeTool,
      addWorkshop, deleteWorkshop, addBook, deleteBook
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};