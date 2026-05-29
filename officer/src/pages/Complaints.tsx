
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, Input, Select, Badge, Button, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { ComplaintStatus, Complaint } from '../types';
import { Search, Filter, Eye, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

const statusLabel = (status: ComplaintStatus) =>
  status === ComplaintStatus.AWAITING_MATERIALS ? 'Waiting for Citizen' : status;

export const Complaints = () => {
  const location = useLocation();
  const isResolvedView = location.pathname.includes('resolved');

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [filterStatus, setFilterStatus] = useState(isResolvedView ? ComplaintStatus.RESOLVED : '');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await ComplaintService.getMyComplaints();
      setComplaints(data);
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    
    if (isResolvedView) {
      setFilterStatus(ComplaintStatus.RESOLVED);
    } else {
      setFilterStatus('');
    }
  }, [isResolvedView]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchComplaints();
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const filtered = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (isResolvedView) {
       if (filterStatus) {
         matchesStatus = c.status === filterStatus;
       } else {
         matchesStatus = [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED, ComplaintStatus.WITHDRAWN].includes(c.status);
       }
    } else {
       if (filterStatus) {
         matchesStatus = c.status === filterStatus;
       } else {
         matchesStatus = ![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED, ComplaintStatus.WITHDRAWN].includes(c.status);
       }
    }

    return matchesSearch && matchesStatus;
  });

  const renderSlaTimer = (c: Complaint) => {
    if (c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED || c.status === ComplaintStatus.REJECTED || c.status === ComplaintStatus.WITHDRAWN) {
       return <span className="text-slate-400 text-xs flex items-center bg-slate-50 px-2 py-1 rounded border border-slate-100"><CheckCircle size={12} className="mr-1"/> Done</span>;
    }
    
    if (c.slaBreached || c.status === ComplaintStatus.ESCALATED) {
       return <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded font-bold text-xs flex items-center"><AlertTriangle size={12} className="mr-1"/> SLA Breached</span>;
    }

    if (!c.slaDeadline) return null;

    const now = new Date();
    const deadline = new Date(c.slaDeadline);
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs < 0) {
       return <span className="text-red-600 font-bold text-xs flex items-center px-2 py-1"><Clock size={12} className="mr-1" /> Overdue</span>;
    }

    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;
    const label = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`;
    const totalHours = diffMs / (1000 * 60 * 60);
    
    let colorClass = "text-green-700 bg-green-50 border-green-200";
    if (totalHours < 24) colorClass = "text-yellow-700 bg-yellow-50 border-yellow-200";
    if (totalHours < 4) colorClass = "text-red-700 bg-red-50 border-red-200";

    return (
      <div className={`flex items-center text-xs font-mono font-medium px-2 py-1 rounded border ${colorClass}`}>
        <Clock size={12} className="mr-1" />
        {label}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isResolvedView ? 'Resolved History' : 'My Assignments'}</h1>
          <p className="text-slate-500">{isResolvedView ? 'Archive of completed tasks' : 'Manage and resolve complaints in your jurisdiction'}</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Input placeholder="Search ID or Title..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
           </div>
           <div className="relative w-48">
             <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Select className="pl-9" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
               <option value="">{isResolvedView ? 'All Archived' : 'All Active'}</option>
               {isResolvedView ? (
                 <>
                   <option value={ComplaintStatus.RESOLVED}>Resolved</option>
                   <option value={ComplaintStatus.CLOSED}>Closed</option>
                   <option value={ComplaintStatus.REJECTED}>Rejected</option>
                   <option value={ComplaintStatus.WITHDRAWN}>Withdrawn</option>
                 </>
               ) : (
                 <>
                   <option value={ComplaintStatus.ASSIGNED}>Assigned</option>
                   <option value={ComplaintStatus.IN_PROGRESS}>In Progress</option>
                   <option value={ComplaintStatus.AWAITING_MATERIALS}>Waiting for Citizen</option>
                   <option value={ComplaintStatus.ESCALATED}>Escalated</option>
                   <option value={ComplaintStatus.REOPENED}>Reopened</option>
                 </>
               )}
             </Select>
           </div>
        </div>

        <div className="divide-y divide-slate-100">
           {filtered.map(c => (
             <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500">#{c.id}</span>
                      {c.slaBreached && <span className="text-xs font-bold text-red-600 flex items-center"><AlertTriangle size={10} className="mr-1"/> BREACH</span>}
                   </div>
                   <h3 className="font-semibold text-slate-900">{c.title}</h3>
                   <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center"><MapPin size={12} className="mr-1"/> {c.location}</span>
                      {renderSlaTimer(c)}
                   </div>
                </div>
                
                <div className="flex items-center gap-4">
                   <Badge variant={c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED ? 'success' : c.status === ComplaintStatus.ESCALATED || c.status === ComplaintStatus.REJECTED ? 'danger' : c.status === ComplaintStatus.UNDER_REVIEW || c.status === ComplaintStatus.WITHDRAWN ? 'secondary' : 'warning'}>{statusLabel(c.status)}</Badge>
                   <Link to={`/complaints/${c.id}`}>
                      <Button variant="outline" size="sm">
                         <Eye size={14} className="mr-2" /> View Details
                      </Button>
                   </Link>
                </div>
             </div>
           ))}
           {filtered.length === 0 && (
             <div className="p-8 text-center text-slate-500">No complaints found.</div>
           )}
        </div>
      </Card>
    </div>
  );
};
