
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
  REJECTED = 'Rejected',
  WITHDRAWN = 'Withdrawn',
  REOPENED = 'Reopened'
}

export enum Priority {
  UNASSIGNED = 'Unassigned',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface TimelineEvent {
  date: string;
  action: string;
  actor: string;
  details?: string;
}

export interface Complaint {
  id: string;
  title: string;
  departmentId: string;
  category?: string;
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
  history: TimelineEvent[];
  slaStartedAt?: string;
  slaDeadline?: string;
  slaBreached?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  address?: string;
  registeredDate: string;
  status: Status; 
  password?: string;
  profilePicture?: string;
  idCardUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  target?: 'All' | 'Users' | 'Officers';
  recipientType?: 'User' | 'Officer' | null;
  recipientId?: string | null;
  priority?: 'Normal' | 'Important' | 'Urgent';
}
