export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl: string;
  managerId?: string;
}

export interface Resource {
  id: string;
  name: string;
  logoUrl: string;
  url: string;
  description: string;
  isOfficial: boolean;
}

export interface ToolAllocation {
  id: string;
  resourceId: string;
  userId: string;
  assignedBy: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Returned';
}

export interface Assignment {
  id: string;
  title: string;
  type: 'Course' | 'Workshop' | 'Reading';
  assignedBy: string;
  assignedTo: string; // User ID
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  sourceName: string;
  grade?: string;
  feedback?: string;
  description?: string;
  estimatedTime?: string;
}

export interface Workshop {
  id: string;
  title: string;
  date: string;
  instructor: string;
  description: string;
  type: 'In-Person' | 'Virtual';
  location?: string; // Physical address or room
  meetingUrl?: string; // Google Meet / Zoom
  recordingUrl?: string;
  materialsUrl?: string;
  attendees: string[]; // User IDs
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  discussionDate: string;
  location?: string;
  meetingUrl?: string;
  slackThreadUrl?: string;
  description: string;
  status: 'Upcoming' | 'Current' | 'Archived';
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  type: 'post' | 'completion' | 'assignment' | 'create' | 'grade' | 'tool_allocation';
  
  // For Slack-style feed
  channel?: string; // e.g., "#random", "#ai-learnings"
  content?: string;
  linkUrl?: string;
  linkTitle?: string;
  
  // Legacy/System actions
  action?: string;
  target?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'alert' | 'info' | 'success';
}