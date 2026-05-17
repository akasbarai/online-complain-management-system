
import React, { useState, useEffect } from 'react';
import { Card, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const Reports = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    ComplaintService.getAnalytics()
      .then(data => setAnalytics({ performance: [], ...data }))
      .catch(() => setAnalytics({ byDept: [], byStatus: [], performance: [] }))
      .finally(() => setLoading(false));
  }, []);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Complaints by Department</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byDept}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#0ea5e9" name="Total Complaints" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Complaint Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="count"
                  label
                >
                  {analytics.byStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Performance Metrics</h3>
        <p className="text-slate-500 mb-4">Performance breakdown by hierarchy levels</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700">
               <tr>
                 <th className="p-3">Level Name</th>
                 <th className="p-3">Avg Resolution Time</th>
                 <th className="p-3">SLA Breaches</th>
                 <th className="p-3">Efficiency</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {analytics.performance.map((metric: any) => (
                 <tr key={metric.id}>
                   <td className="p-3 font-medium text-slate-800">{metric.name}</td>
                   <td className="p-3 text-slate-600">{metric.avgDays}</td>
                   <td className={`p-3 font-semibold ${metric.breaches > 0 ? 'text-red-600' : 'text-slate-500'}`}>{metric.breaches}</td>
                   <td className={`p-3 ${metric.efficiency !== 'N/A' && parseInt(metric.efficiency) > 80 ? 'text-green-600' : 'text-orange-600'}`}>
                     {metric.efficiency}
                   </td>
                 </tr>
               ))}
               {analytics.performance.length === 0 && (
                 <tr>
                   <td colSpan={4} className="p-4 text-center text-slate-500">No hierarchy levels defined yet.</td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
