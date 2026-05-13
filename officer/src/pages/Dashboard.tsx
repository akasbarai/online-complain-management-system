
import React, { useState, useEffect } from 'react';
import { Card, Spinner } from '../components/ui';
import { ComplaintService, AuthService, NotificationService } from '../services/api';
import { Clock, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { ComplaintStatus, Complaint } from '../types';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const officer = AuthService.getCurrentOfficer();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ComplaintService.getMyComplaints(),
      NotificationService.getRecent()
    ]).then(([complaints, notifications]) => {
      setComplaints(complaints);
      setNotifications(notifications);
    }).catch(() => {
      setComplaints([]);
      setNotifications([]);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Assigned', value: complaints.filter(c => c.status === ComplaintStatus.ASSIGNED).length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'In Progress', value: complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Awaiting Materials', value: complaints.filter(c => c.status === ComplaintStatus.AWAITING_MATERIALS).length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Resolved', value: complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {officer?.name}</h1>
          <p className="text-slate-500">Here is your daily activity overview for {officer?.jurisdiction}</p>
        </div>
        <span className="text-sm font-medium px-3 py-1 bg-primary-100 text-primary-800 rounded-full">
           Status: Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold">Active Assignments</h3>
               <Link to="/complaints" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
                 View All <ArrowRight size={14} className="ml-1" />
               </Link>
            </div>
            <div className="space-y-3">
               {complaints.filter(c => c.status !== ComplaintStatus.RESOLVED).slice(0, 3).map(c => (
                 <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                       <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                       <div>
                          <p className="font-medium text-slate-900">{c.title}</p>
                          <p className="text-xs text-slate-500">{c.id} • {c.location}</p>
                       </div>
                    </div>
                 </div>
               ))}
               {complaints.filter(c => c.status !== ComplaintStatus.RESOLVED).length === 0 && (
                  <p className="text-slate-500 italic text-sm">No pending assignments. Good job!</p>
               )}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-6 h-full">
            <h3 className="text-lg font-semibold mb-4">Notifications</h3>
            <div className="space-y-4">
               {notifications.map(n => (
                 <div key={n.id} className="p-3 bg-slate-50 rounded border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                       <span className="text-xs text-slate-400">Today</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                 </div>
               ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
