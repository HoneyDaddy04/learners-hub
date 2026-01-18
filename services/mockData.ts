import { User, UserRole, Resource, Assignment, ActivityLog, Notification, ToolAllocation } from '../types';

// Mock Users
export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@company.com',
    role: UserRole.SUPER_ADMIN,
    department: 'People Operations',
    avatarUrl: 'https://picsum.photos/id/1011/200/200'
  },
  {
    id: 'u4',
    name: 'Mike Ross',
    email: 'mike.r@company.com',
    role: UserRole.ADMIN,
    department: 'Engineering Lead',
    avatarUrl: 'https://picsum.photos/id/1005/200/200',
    managerId: 'u1'
  },
  {
    id: 'u2',
    name: 'David Chen',
    email: 'david.c@company.com',
    role: UserRole.STAFF,
    department: 'Engineering',
    avatarUrl: 'https://picsum.photos/id/1012/200/200',
    managerId: 'u4'
  },
  {
    id: 'u3',
    name: 'Elena Rodriguez',
    email: 'elena.r@company.com',
    role: UserRole.STAFF,
    department: 'Product',
    avatarUrl: 'https://picsum.photos/id/1027/200/200',
    managerId: 'u4'
  }
];

// Mock Resources
export const MOCK_RESOURCES: Resource[] = [
  {
    id: 'r1',
    name: 'Talstack',
    logoUrl: 'https://logo.clearbit.com/talstack.com',
    url: 'https://talstack.com',
    description: 'Our primary platform for technical skills and career development.',
    isOfficial: true
  },
  {
    id: 'r2',
    name: 'Coursera',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Coursera-Logo_600x600.svg',
    url: 'https://coursera.org',
    description: 'University-grade courses and professional certifications.',
    isOfficial: false
  },
  {
    id: 'r3',
    name: 'O\'Reilly Learning',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/O%27Reilly_Media_logo_2019.svg',
    url: 'https://oreilly.com',
    description: 'Technical books and video courses.',
    isOfficial: true
  }
];

// Mock Tool Allocations
export const MOCK_TOOL_ALLOCATIONS: ToolAllocation[] = [
  {
    id: 'ta1',
    resourceId: 'r3',
    userId: 'u2',
    assignedBy: 'Sarah Jenkins',
    startDate: '2023-01-15',
    status: 'Active'
  },
  {
    id: 'ta2',
    resourceId: 'r2',
    userId: 'u3',
    assignedBy: 'Sarah Jenkins',
    startDate: '2023-02-01',
    endDate: '2023-08-01',
    status: 'Returned'
  }
];

// Realistic Assignments
export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'a1',
    title: 'Advanced TypeScript: Generics & Utility Types',
    type: 'Course',
    assignedBy: 'Mike Ross',
    assignedTo: 'u2',
    dueDate: '2023-11-15',
    status: 'In Progress',
    sourceName: 'Talstack',
    description: 'Deep dive into advanced typing patterns to improve code safety.',
    estimatedTime: '4h 30m'
  },
  {
    id: 'a2',
    title: 'System Design: Scalability Patterns',
    type: 'Course',
    assignedBy: 'Mike Ross',
    assignedTo: 'u2',
    dueDate: '2023-11-30',
    status: 'Not Started',
    sourceName: 'Talstack',
    description: 'Understanding load balancing, caching strategies, and partitioning.',
    estimatedTime: '6h 00m'
  },
  {
    id: 'a3',
    title: 'Q4 Security Compliance Training',
    type: 'Course',
    assignedBy: 'Sarah Jenkins',
    assignedTo: 'u2',
    dueDate: '2023-12-01',
    status: 'Not Started',
    sourceName: 'Internal',
    description: 'Mandatory annual security review for all engineering staff.',
    estimatedTime: '1h 00m'
  },
  {
    id: 'a4',
    title: 'Effective Communication for Leaders',
    type: 'Workshop',
    assignedBy: 'Sarah Jenkins',
    assignedTo: 'u2',
    dueDate: '2023-11-20',
    status: 'Completed',
    sourceName: 'Internal',
    description: 'Workshop focusing on giving feedback and running 1:1s.',
    estimatedTime: '2h 00m',
    grade: 'Pass',
    feedback: 'Great participation in the roleplay scenarios.'
  }
];

// Slack-style Activity Feed
export const MOCK_ACTIVITY: ActivityLog[] = [
  {
    id: 'feed1',
    userId: 'u4',
    userName: 'Mike Ross',
    userAvatar: 'https://picsum.photos/id/1005/200/200',
    timestamp: '10 mins ago',
    type: 'post',
    channel: '#ai-learnings',
    content: 'Just watched this incredible breakdown of how mixture-of-experts models actually route tokens. Essential viewing for the infra team.',
    linkTitle: 'Visualizing MoE Architecture',
    linkUrl: 'https://youtube.com/watch?v=example'
  },
  {
    id: 'feed2',
    userId: 'u3',
    userName: 'Elena Rodriguez',
    userAvatar: 'https://picsum.photos/id/1027/200/200',
    timestamp: '2 hours ago',
    type: 'post',
    channel: '#random',
    content: 'Found a great list of "Falsehoods programmers believe about time". We should definitely check our timezone logic again 😅',
    linkTitle: 'Falsehoods about Time',
    linkUrl: 'https://infiniteundo.com/compare'
  },
  {
    id: 'feed3',
    userId: 'u1',
    userName: 'Sarah Jenkins',
    userAvatar: 'https://picsum.photos/id/1011/200/200',
    timestamp: '4 hours ago',
    type: 'post',
    channel: '#book-club',
    content: 'Reminder! We are discussing Chapter 4 of "Designing Data-Intensive Applications" this Friday. Please come prepared with one question.',
  },
  {
    id: 'feed4',
    userId: 'u2',
    userName: 'David Chen',
    userAvatar: 'https://picsum.photos/id/1012/200/200',
    timestamp: 'Yesterday',
    type: 'post',
    channel: '#engineering',
    content: 'Just finished the "Advanced TypeScript" module on Talstack. Highly recommend the section on conditional types.',
    linkTitle: 'Talstack: Advanced TypeScript',
    linkUrl: '#'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'New Workshop Added',
    message: 'Advanced React Patterns has been scheduled.',
    date: '1 hour ago',
    read: false,
    type: 'info'
  }
];