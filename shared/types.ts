/** API shapes shared by the server and the web app. Dates travel as ISO strings. */

export type Role = 'owner' | 'admin' | 'manager' | 'member';
export type MemberStatus = 'invited' | 'active' | 'removed';
export type PathStatus = 'draft' | 'published' | 'archived';
export type EnrollmentSource = 'self' | 'assigned' | 'goal';

export const SOURCE_OPTIONS = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'khan', label: 'Khan Academy' },
  { key: 'fcc', label: 'freeCodeCamp' },
  { key: 'mslearn', label: 'Microsoft Learn' },
  { key: 'google', label: 'Google (Skillshop, Grow)' },
  { key: 'coursera', label: 'Coursera (free audit)' },
  { key: 'ocw', label: 'MIT OpenCourseWare' },
  { key: 'openlearn', label: 'OpenLearn' },
] as const;

export interface MeResponse {
  user: { email: string; name: string | null; emailVerified: boolean };
  member: { id: string; orgId: string; role: Role; name: string; email: string } | null;
  org: { id: string; name: string } | null;
  invites: { membershipId: string; orgName: string }[];
}

export interface ProgressInfo {
  itemsDone: number;
  itemsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  percent: number;
}

export interface EnrollmentInfo {
  id: string;
  source: EnrollmentSource;
  dueDate: string | null;
  completedAt: string | null;
  progress: ProgressInfo;
}

export interface PathSummary {
  id: string;
  title: string;
  roleName: string;
  description: string | null;
  level: string | null;
  status: PathStatus;
  moduleCount: number;
  itemCount: number;
  totalDurationSec: number;
  createdAt: string;
  enrollment: EnrollmentInfo | null;
}

export interface PathItem {
  id: string;
  position: number;
  why: string | null;
  catalog: {
    source: 'youtube' | 'web';
    externalId: string | null;
    url: string;
    title: string;
    provider: string;
    format: 'video' | 'course' | 'article';
    durationSec: number | null;
    thumbnailUrl: string | null;
  };
  progress: { status: 'in_progress' | 'done'; watchedSec: number; lastPositionSec: number } | null;
}

export interface PathQuestion { id: string; prompt: string; options: string[] }

export interface PathModule {
  id: string;
  position: number;
  title: string;
  summary: string | null;
  items: PathItem[];
  quiz: PathQuestion[];
  quizPassed: boolean;
  bestScore: number | null;
}

export interface PathDetail extends PathSummary {
  context: string | null;
  modules: PathModule[];
  canEdit: boolean;
  canPublish: boolean;
}

export interface MyEnrollment {
  id: string;
  pathId: string;
  pathTitle: string;
  roleName: string;
  source: EnrollmentSource;
  dueDate: string | null;
  completedAt: string | null;
  assignedByName: string | null;
  progress: ProgressInfo;
}

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  department: string | null;
  jobRoleId: string | null;
  jobRoleName: string | null;
  managerId: string | null;
  managerName: string | null;
}

export interface JobRole { id: string; name: string }

export interface TeamRow {
  member: { id: string; name: string; email: string; status: MemberStatus; department: string | null; jobRoleName: string | null };
  enrollments: {
    id: string;
    pathId: string;
    pathTitle: string;
    source: EnrollmentSource;
    dueDate: string | null;
    completedAt: string | null;
    overdue: boolean;
    progress: ProgressInfo;
  }[];
}

export interface BeatResponse { status: 'in_progress' | 'done'; watchedSec: number; justCompleted: boolean }
export interface QuizResult { score: number; total: number; passed: boolean; correct: boolean[] }

/** Newline-delimited JSON events streamed while the AI builds a path. */
export type SourcingEvent =
  | { type: 'step'; step: number; label: string }
  | { type: 'done'; pathId: string }
  | { type: 'error'; message: string }
  | { type: 'ping' };
