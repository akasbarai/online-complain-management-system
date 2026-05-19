
export enum Status {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  BLOCKED = 'Blocked',
  PENDING = 'Pending'
}

export enum ComplaintStatus {
  SUBMITTED = 'Submitted',
  ASSIGNED = 'Assigned',
  UNDER_REVIEW = 'Under Review',
  AWAITING_MATERIALS = 'Awaiting Materials',
  IN_PROGRESS = 'In Progress',
  ESCALATED = 'Escalated',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
  REJECTED = 'Rejected'
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface Department {
  id: string;
  name: string;
  description: string;
  status: Status;
  stats: {
    complaints: number;
    officers: number;
  };
}

export interface HierarchyLevel {
  id: string;
  departmentId: string;
  name: string;
  parentId: string | null;
  status: Status;
  levelDepth: number;
}

export interface Officer {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  hierarchyLevelId: string | null;
  role: 'Officer' | 'Admin';
  jurisdiction?: string;
  status: Status;
  profilePhoto?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  address?: string;
  registeredDate: string;
  status: Status;
  complaintCount: number;
  profilePicture?: string;
  idCardUrl?: string;
  passwordResetRequested?: boolean;
  passwordResetRequestedAt?: string | null;
}

export interface Complaint {
  id: string;
  title: string;
  departmentId: string;
  userId: string;
  description: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string;
  status: ComplaintStatus;
  assignedOfficerId: string | null;
  currentHierarchyLevelId: string | null;
  priority?: Priority;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    date: string;
    action: string;
    actor: string;
  }>;
  slaDeadline?: string;
  slaBreached?: boolean;
  isTrashed?: boolean;
}

export interface EscalationRule {
  id: string;
  departmentId: string;
  hierarchyLevelId: string;
  timeLimitHours: number;
  targetLevelId: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  target: 'All' | 'Users' | 'Officers';
  recipientType?: 'User' | 'Officer' | null;
  recipientId?: string | null;
  priority?: 'Normal' | 'Important' | 'Urgent';
  date: string;
  read?: boolean;
}
