import React, { useState, useEffect } from 'react';
import { Card, Skeleton } from '../components/ui';
import { DeptService, ComplaintService, OfficerService, UserService } from '../services/api';
import { AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';

export const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    depts: [] as any[],
    complaints: [] as any[],
    officers: [] as any[],
    users: [] as any[]
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [depts, complaints, officers, users] = await Promise.all([
          DeptService.getAll(),
          ComplaintService.getAll(),
          OfficerService.getAll(),
          UserService.getAll()
        ]);
        setData({ depts, complaints, officers, users });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const { depts, complaints, officers } = data;

  const stats = [
    { label: 'Total Complaints', value: complaints.length, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Resolved', value: complaints.filter(c => c.status === 'Resolved').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending/Escalated', value: complaints.filter(c => ['Escalated', 'Submitted', 'Under Review'].includes(c.status)).length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Officers', value: officers.filter(o => o.status === 'Active').length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">System overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
            </Card>
          ))
        ) : (
          stats.map((stat) => (
            <Card key={stat.label} className="p-6 flex items-center space-x-4">
              <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Department Status</h3>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="space-y-2 flex flex-col items-end">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))
            ) : (
              depts.map(d => {
                const deptComplaints = complaints.filter(c => c.departmentId === d.id).length;
                return (
                  <div key={d.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{deptComplaints} Complaints</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Escalations</h3>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 border border-slate-100 rounded-md">
                  <Skeleton className="h-4 w-4 rounded-full mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {complaints.filter(c => c.status === 'Escalated').slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-md border border-red-100">
                    <AlertCircle className="text-red-500 mt-0.5" size={16} />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Complaint #{c.id}</p>
                      <p className="text-xs text-red-600 mt-1">{c.description}</p>
                    </div>
                  </div>
                ))}
                {complaints.filter(c => c.status === 'Escalated').length === 0 && (
                  <p className="text-slate-500 text-sm italic">No active escalations.</p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
