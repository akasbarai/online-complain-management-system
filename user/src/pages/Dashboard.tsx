import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, ClipboardList, Clock, Hourglass, MapPin, Plus, Search } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { Complaint, ComplaintStatus } from '../types';

const statusTone = (status: ComplaintStatus): 'success' | 'secondary' | 'warning' | 'danger' | 'info' => {
  if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) return 'success';
  if (status === ComplaintStatus.REJECTED) return 'danger';
  if (status === ComplaintStatus.UNDER_REVIEW || status === ComplaintStatus.SUBMITTED) return 'info';
  return 'warning';
};

const isOpenComplaint = (status: ComplaintStatus) =>
  ![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED].includes(status);

export const Dashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const openCount = complaints.filter(c => isOpenComplaint(c.status)).length;
  const resolvedCount = complaints.filter(c => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED).length;
  const latestComplaint = complaints[0];
  const filteredComplaints = complaints.filter(c => {
    const text = `${c.title} ${c.description} ${c.location || ''} ${c.status}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="page-title">My Dashboard</h2>
          <p className="page-subtitle">Track submitted issues and recent updates.</p>
        </div>
        <Link to="/lodge">
          <Button className="w-full gap-2 sm:w-auto">
            <Plus size={18} /> Lodge Complaint
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total complaints</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{complaints.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <ClipboardList size={22} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">In progress</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{openCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <Hourglass size={22} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Resolved</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{resolvedCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </Card>
      </div>

      {latestComplaint && (
        <Card className="overflow-hidden border-primary-100 bg-gradient-to-r from-primary-50 to-white">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Latest complaint</p>
              <h3 className="mt-1 font-semibold text-slate-950">{latestComplaint.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{new Date(latestComplaint.updatedAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusTone(latestComplaint.status)}>{latestComplaint.status}</Badge>
              <Link to={`/complaints/${latestComplaint.id}`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-slate-950">Complaint history</h3>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search complaints"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {complaints.length === 0 && (
          <div className="flex flex-col items-center p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-950">No complaints yet</h3>
            <p className="mb-6 mt-2 max-w-sm text-sm leading-6 text-slate-500">Start by reporting an issue in your area.</p>
            <Link to="/lodge"><Button variant="outline">Lodge First Complaint</Button></Link>
          </div>
        )}

        {complaints.length > 0 && filteredComplaints.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No matching complaints found.</div>
        )}

        <div className="divide-y divide-slate-100">
          {filteredComplaints.map(c => (
            <Link to={`/complaints/${c.id}`} key={c.id} className="group block">
              <div className="relative p-5 transition-colors hover:bg-slate-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950 transition-colors group-hover:text-primary-700">{c.title}</h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">#{c.id}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={12}/> {new Date(c.createdAt).toLocaleDateString()}</span>
                      {c.location && <span className="flex items-center gap-1"><MapPin size={12}/> {c.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge variant={statusTone(c.status)}>{c.status}</Badge>
                    <ChevronRight className="text-slate-300 transition-colors group-hover:text-primary-500" size={20} />
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-600">{c.description}</p>

                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
                  {(c.history ?? []).slice(-1).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="h-2 w-2 rounded-full bg-primary-500"></div>
                      <span>Latest: <span className="font-medium text-slate-700">{h.action}</span></span>
                      <span className="text-slate-400">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
};
