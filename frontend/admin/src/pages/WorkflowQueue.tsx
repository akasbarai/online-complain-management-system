import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, FileText, RefreshCw, ShieldAlert, UserPlus } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { WorkflowService } from '../services/api';
import { ComplaintStatus, WorkflowQueue as WorkflowQueueData, WorkflowQueueComplaint } from '../types';

const emptyQueue: WorkflowQueueData = {
  summary: {
    unassigned: 0,
    escalated: 0,
    slaRisk: 0,
    pendingUsers: 0,
    officerSetupIssues: 0
  },
  unassignedComplaints: [],
  escalatedComplaints: [],
  slaRiskComplaints: [],
  pendingUsers: [],
  officerSetupIssues: []
};

const statusBadge = (status: ComplaintStatus) => {
  if (status === ComplaintStatus.ESCALATED || status === ComplaintStatus.REJECTED) return 'danger';
  if (status === ComplaintStatus.RESOLVED) return 'success';
  if (status === ComplaintStatus.SUBMITTED || status === ComplaintStatus.UNDER_REVIEW) return 'secondary';
  return 'warning';
};

const StatCard = ({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`rounded-lg p-3 ${tone}`}>
        <Icon size={22} />
      </div>
    </div>
  </Card>
);

const ComplaintRow = ({ complaint }: { complaint: WorkflowQueueComplaint }) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-slate-900">{complaint.title}</p>
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">#{complaint.id}</span>
        <Badge variant={statusBadge(complaint.status)}>{complaint.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {complaint.departmentName || 'Unknown department'} · {complaint.userName || complaint.userId}
        {complaint.slaDeadline ? ` · SLA ${new Date(complaint.slaDeadline).toLocaleString()}` : ''}
      </p>
    </div>
    <Link to="/complaints">
      <Button size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
        Open <ArrowRight size={14} />
      </Button>
    </Link>
  </div>
);

export const WorkflowQueue = () => {
  const [queue, setQueue] = useState<WorkflowQueueData>(emptyQueue);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);
    try {
      setQueue(await WorkflowService.getQueue());
    } catch (err) {
      console.error('Failed to load workflow queue:', err);
      setQueue(emptyQueue);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflow Queue</h1>
          <p className="text-slate-500">Operational work that needs admin attention.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={loadQueue}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Unassigned" value={queue.summary.unassigned} icon={FileText} tone="bg-blue-50 text-blue-700" />
        <StatCard label="Escalated" value={queue.summary.escalated} icon={AlertTriangle} tone="bg-red-50 text-red-700" />
        <StatCard label="SLA Risk" value={queue.summary.slaRisk} icon={Clock} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Pending Users" value={queue.summary.pendingUsers} icon={UserPlus} tone="bg-purple-50 text-purple-700" />
        <StatCard label="Officer Setup" value={queue.summary.officerSetupIssues} icon={ShieldAlert} tone="bg-slate-100 text-slate-700" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Unassigned Complaints</h2>
            <Link to="/complaints" className="text-sm font-medium text-primary-700 hover:underline">Manage</Link>
          </div>
          {queue.unassignedComplaints.length ? (
            queue.unassignedComplaints.map(complaint => <ComplaintRow key={complaint.id} complaint={complaint} />)
          ) : (
            <p className="text-sm text-slate-500">No unassigned complaints.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Escalated Complaints</h2>
            <Link to="/complaints" className="text-sm font-medium text-primary-700 hover:underline">Reassign</Link>
          </div>
          {queue.escalatedComplaints.length ? (
            queue.escalatedComplaints.map(complaint => <ComplaintRow key={complaint.id} complaint={complaint} />)
          ) : (
            <p className="text-sm text-slate-500">No active escalations.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">SLA Risk</h2>
            <Link to="/complaints" className="text-sm font-medium text-primary-700 hover:underline">Review</Link>
          </div>
          {queue.slaRiskComplaints.length ? (
            queue.slaRiskComplaints.map(complaint => <ComplaintRow key={complaint.id} complaint={complaint} />)
          ) : (
            <p className="text-sm text-slate-500">No complaints are currently near or past SLA.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Pending User Verification</h2>
              <Link to="/users" className="text-sm font-medium text-primary-700 hover:underline">Verify</Link>
            </div>
            {queue.pendingUsers.length ? (
              <div className="divide-y divide-slate-100">
                {queue.pendingUsers.map(user => (
                  <div key={user.id} className="py-3">
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No users awaiting verification.</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Officer Setup Issues</h2>
              <Link to="/officers" className="text-sm font-medium text-primary-700 hover:underline">Fix</Link>
            </div>
            {queue.officerSetupIssues.length ? (
              <div className="divide-y divide-slate-100">
                {queue.officerSetupIssues.map(officer => (
                  <div key={officer.id} className="py-3">
                    <p className="font-semibold text-slate-900">{officer.name}</p>
                    <p className="text-sm text-slate-500">
                      {!officer.hierarchyLevelId ? 'Missing hierarchy level' : ''}
                      {!officer.hierarchyLevelId && !officer.jurisdiction ? ' · ' : ''}
                      {!officer.jurisdiction ? 'Missing jurisdiction' : ''}
                      {officer.status !== 'Active' ? `${(!officer.hierarchyLevelId || !officer.jurisdiction) ? ' · ' : ''}${officer.status}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No officer setup issues.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
