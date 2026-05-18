
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
  WITHDRAWN = 'Withdrawn'
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
  workload?: {
    active: number;
    newAssignments: number;
    slaRisk: number;
  };
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
  target: 'All' | 'Users' | 'Officers' | 'Admins';
  date: string;
  read?: boolean;
}

export interface WorkflowQueueComplaint {
  id: string;
  title: string;
  departmentId: string;
  departmentName?: string;
  userId: string;
  userName?: string;
  location?: string;
  status: ComplaintStatus;
  priority?: Priority;
  assignedOfficerId: string | null;
  officerName?: string;
  currentHierarchyLevelId: string | null;
  hierarchyName?: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
  slaBreached?: boolean;
}

export interface WorkflowQueue {
  summary: {
    unassigned: number;
    escalated: number;
    slaRisk: number;
    pendingUsers: number;
    officerSetupIssues: number;
  };
  unassignedComplaints: WorkflowQueueComplaint[];
  escalatedComplaints: WorkflowQueueComplaint[];
  slaRiskComplaints: WorkflowQueueComplaint[];
  pendingUsers: Array<Pick<User, 'id' | 'name' | 'email' | 'mobile' | 'address' | 'status' | 'registeredDate'>>;
  officerSetupIssues: Array<Pick<Officer, 'id' | 'name' | 'email' | 'departmentId' | 'hierarchyLevelId' | 'jurisdiction' | 'status'> & {
    departmentName?: string;
  }>;
}
