import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, ClipboardList, Clock, Hourglass, MapPin, Plus, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { Complaint, ComplaintStatus } from '../types';

const statusVariant = (status: ComplaintStatus) => {
  if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) return 'success';
  if (status === ComplaintStatus.REJECTED) return 'danger';
  if (status === ComplaintStatus.WITHDRAWN) return 'secondary';
  if (status === ComplaintStatus.SUBMITTED || status === ComplaintStatus.UNDER_REVIEW) return 'secondary';
  return 'warning';
};

export const Dashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ComplaintService.getMyComplaints()
      .then(data => setComplaints(data))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const activeComplaints = complaints.filter(c => ![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED, ComplaintStatus.WITHDRAWN].includes(c.status)).length;
  const resolvedComplaints = complaints.filter(c => [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(c.status)).length;
  const latestComplaint = complaints[0];

  return (
    <div className="space-y-6">
      <div className="premium-dark overflow-hidden bg-[linear-gradient(135deg,#071624_0%,#102f56_62%,#155fba_100%)]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/15">
              <Sparkles size={14} /> Citizen dashboard
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back, stay in the loop.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Track submitted issues, view the latest officer activity, and lodge a new complaint when something needs attention.
            </p>
          </div>
          <Link to="/lodge">
            <Button size="lg" className="w-full gap-2 bg-white text-ink-950 shadow-lg shadow-ink-950/20 hover:bg-primary-50 lg:w-auto">
              <Plus size={18} /> Lodge Complaint
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-primary-600 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">Total</span>
            <div className="rounded-md bg-primary-50 p-2 text-primary-700">
              <ClipboardList size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink-900">{complaints.length}</p>
          <p className="text-sm text-slate-500">Complaints submitted</p>
        </Card>
        <Card className="border-t-4 border-t-amberline-500 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">Active</span>
            <div className="rounded-md bg-amberline-50 p-2 text-amberline-600">
              <Hourglass size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink-900">{activeComplaints}</p>
          <p className="text-sm text-slate-500">Currently being handled</p>
        </Card>
        <Card className="border-t-4 border-t-civic-600 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">Resolved</span>
            <div className="rounded-md bg-civic-50 p-2 text-civic-700">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink-900">{resolvedComplaints}</p>
          <p className="text-sm text-slate-500">Completed or closed</p>
        </Card>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="page-title">My Complaints</h2>
          <p className="page-subtitle">
            {latestComplaint ? `Latest activity starts with #${latestComplaint.id}.` : 'Your submitted complaints will appear here.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {complaints.length === 0 && (
          <Card className="flex flex-col items-center p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-ink-900">No complaints yet</h3>
            <p className="mb-6 mt-2 max-w-sm text-sm leading-6 text-slate-500">When you report a civic issue, this becomes your clean tracking desk.</p>
            <Link to="/lodge">
              <Button className="gap-2"><Plus size={16} /> Lodge First Complaint</Button>
            </Link>
          </Card>
        )}

        {complaints.map(c => (
          <Link to={`/complaints/${c.id}`} key={c.id} className="group block">
            <Card className="relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-premium">
              <div className="absolute left-0 top-0 h-full w-1 bg-slate-200 transition-colors group-hover:bg-primary-600" />

              <div className="flex flex-col justify-between gap-4 pl-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-ink-950 transition-colors group-hover:text-primary-800">{c.title}</h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600 ring-1 ring-slate-200">#{c.id}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center"><Clock size={12} className="mr-1" /> {new Date(c.createdAt).toLocaleDateString()}</span>
                    {c.location && <span className="flex items-center"><MapPin size={12} className="mr-1" /> {c.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  <ChevronRight className="text-slate-300 transition-colors group-hover:text-primary-700" size={20} />
                </div>
              </div>

              <p className="mb-4 mt-3 line-clamp-2 max-w-2xl pl-3 text-sm leading-6 text-slate-600">{c.description}</p>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 pl-3">
                {(c.history ?? []).slice(-1).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="h-2 w-2 rounded-full bg-civic-500" />
                    <span>Latest: <span className="font-medium text-slate-700">{h.action}</span></span>
                    <span className="text-slate-400">- {new Date(h.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
