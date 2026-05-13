
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { Plus, MapPin, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { ComplaintStatus, Complaint } from '../types';

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
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">My Dashboard</h2>
           <p className="text-slate-500">Welcome back! Track your submitted issues here.</p>
        </div>
        <Link to="/lodge">
          <Button className="shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40">
             <Plus size={18} className="mr-2" /> Lodge Complaint
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {complaints.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <AlertCircle size={32} />
             </div>
             <h3 className="text-lg font-medium text-slate-900">No Complaints Yet</h3>
             <p className="text-slate-500 mb-6 max-w-sm">You haven't submitted any complaints. Use the button above to report an issue in your area.</p>
             <Link to="/lodge"><Button variant="outline">Lodge First Complaint</Button></Link>
          </Card>
        )}
        
        {complaints.map(c => (
          <Link to={`/complaints/${c.id}`} key={c.id} className="block group">
            <Card className="p-5 hover:shadow-md transition-all border-slate-200 group-hover:border-primary-200 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-primary-500 transition-colors"></div>
               
               <div className="flex justify-between items-start mb-2 pl-3">
                  <div>
                     <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary-700 transition-colors">{c.title}</h3>
                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">#{c.id}</span>
                     </div>
                     <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        <span className="flex items-center"><Clock size={12} className="mr-1"/> {new Date(c.createdAt).toLocaleDateString()}</span>
                        {c.location && <span className="flex items-center"><MapPin size={12} className="mr-1"/> {c.location}</span>}
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <Badge variant={c.status === ComplaintStatus.RESOLVED ? 'success' : c.status === ComplaintStatus.UNDER_REVIEW ? 'secondary' : 'warning'}>{c.status}</Badge>
                     <ChevronRight className="text-slate-300 group-hover:text-primary-500 transition-colors" size={20} />
                  </div>
               </div>
               
               <p className="text-sm text-slate-600 line-clamp-2 mb-4 pl-3 max-w-2xl">{c.description}</p>
               
               <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 pl-3">
                  {c.history.slice(-1).map((h, i) => (
                    <div key={i} className="text-xs flex items-center gap-2 text-slate-500">
                       <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                       <span>Latest: <span className="font-medium text-slate-700">{h.action}</span></span>
                       <span className="text-slate-400">• {new Date(h.date).toLocaleDateString()}</span>
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
