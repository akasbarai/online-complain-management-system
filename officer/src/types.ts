
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
  UNASSIGNED = 'Unassigned',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface HierarchyLevel {
  id: string;
  name: string;
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
  // Denormalized fields for Officer App context
  designation?: string; 
}

export interface User {
  id: string;
  name: string;
  email: string;
  registeredDate: string;
  status: Status;
  complaintCount?: number;
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
  priority?: Priority;
  assignedOfficerId: string | null;
  currentHierarchyLevelId: string | null;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    date: string;
    action: string;
    actor: string;
  }>;
  slaStartedAt?: string;
  slaDeadline?: string;
  slaBreached?: boolean;
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
