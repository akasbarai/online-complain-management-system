
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Textarea, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { Complaint, ComplaintStatus } from '../types';
import { ArrowLeft, Clock, MapPin, FileText, User } from 'lucide-react';

export const ComplaintDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawMode, setIsWithdrawMode] = useState(false);

  useEffect(() => {
    if (id) {
      ComplaintService.getById(id)
        .then(data => setComplaint(data))
        .catch(() => navigate('/'))
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const refresh = async () => {
    if (id) {
      try {
        const data = await ComplaintService.getById(id);
        setComplaint(data);
      } catch {
        // ignore
      }
    }
  };

  const handleWithdraw = async () => {
    if (complaint && withdrawReason) {
      try {
        await ComplaintService.withdraw(complaint.id, withdrawReason);
        refresh();
        setIsWithdrawMode(false);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!complaint) return <div className="p-8 text-center">Complaint not found.</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/')} className="pl-0 text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">{complaint.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
               <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">#{complaint.id}</span>
               <span>•</span>
               <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
            </div>
         </div>
         <div className="flex gap-3">
            {complaint.status !== ComplaintStatus.CLOSED && complaint.status !== ComplaintStatus.RESOLVED && (
               <Button variant="danger" size="sm" onClick={() => setIsWithdrawMode(!isWithdrawMode)}>
                 {isWithdrawMode ? 'Cancel Withdrawal' : 'Withdraw Complaint'}
               </Button>
            )}
         </div>
      </div>

      {isWithdrawMode && (
        <Card className="p-6 border-red-200 bg-red-50">
           <h3 className="font-bold text-red-800 mb-2">Withdraw Complaint</h3>
           <p className="text-sm text-red-600 mb-4">Are you sure? This action cannot be undone. Please provide a reason.</p>
           <Textarea 
             placeholder="Reason for withdrawal (e.g. Issue resolved on its own)" 
             className="bg-white mb-4"
             value={withdrawReason}
             onChange={e => setWithdrawReason(e.target.value)}
           />
           <Button variant="danger" onClick={handleWithdraw}>Confirm Withdrawal</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-slate-900">Current Status</h3>
                  <Badge variant={
                     complaint.status === ComplaintStatus.RESOLVED ? 'success' : 
                     complaint.status === ComplaintStatus.UNDER_REVIEW ? 'secondary' :
                     (complaint.status === ComplaintStatus.AWAITING_MATERIALS || complaint.status === ComplaintStatus.IN_PROGRESS || complaint.status === ComplaintStatus.ASSIGNED) ? 'warning' :
                     'warning'
                  }>
                    {complaint.status}
                  </Badge>
               </div>
               
               <div className="relative pt-6 pb-2">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full ${complaint.status === ComplaintStatus.RESOLVED ? 'bg-green-500 w-full' : 'bg-primary-500 w-1/3'}`}></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium uppercase tracking-wide">
                     <span>Submitted</span>
                     <span>{
                        complaint.status === ComplaintStatus.UNDER_REVIEW ? 'Under Review' :
                        complaint.status === ComplaintStatus.AWAITING_MATERIALS ? 'Awaiting Materials' :
                        'In Progress'
                     }</span>
                     <span>Resolved</span>
                  </div>
               </div>
            </Card>

            <Card className="p-6 space-y-6">
               <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                    <FileText size={14} className="mr-1" /> Description
                  </h4>
                  <p className="text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {complaint.description}
                  </p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                       <MapPin size={14} className="mr-1" /> Location
                     </h4>
                     <p className="font-medium text-slate-900">{complaint.location}</p>
                  </div>
               </div>
               
               {complaint.imageUrl && (
                  <div className="pt-4 border-t border-slate-100 mt-4">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                       <FileText size={14} className="mr-1" /> Attached Evidence
                     </h4>
                     {complaint.imageUrl.startsWith('data:application/pdf') ? (
                         <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center text-slate-700">
                               <FileText className="text-red-500 mr-3" size={24} />
                               <span className="font-medium text-sm">PDF Document</span>
                            </div>
                            <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => {
                                  const win = window.open();
                                  if (win) {
                                     win.document.write('<iframe src="' + complaint.imageUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                  }
                               }}
                            >
                               View
                            </Button>
                         </div>
                     ) : (
                         <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 mt-2">
                           <img 
                              src={complaint.imageUrl} 
                              alt="Evidence" 
                              className="w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity bg-slate-100" 
                              onClick={() => {
                                  const win = window.open();
                                  if (win) {
                                     win.document.write('<img src="' + complaint.imageUrl + '" style="max-width: 100%; height: auto;" />');
                                  }
                              }}
                           />
                         </div>
                     )}
                  </div>
               )}
            </Card>
         </div>

         <div>
            <Card className="p-6 h-full">
               <h3 className="font-bold text-slate-900 mb-6 flex items-center">
                 <Clock size={18} className="mr-2 text-slate-400" /> Timeline
               </h3>
               
               <div className="space-y-8 relative before:absolute before:left-3.5 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                  {complaint.history.map((event, index) => (
                    <div key={index} className="relative pl-10">
                       <div className="absolute left-0 top-1 w-7 h-7 bg-white border-2 border-primary-500 rounded-full flex items-center justify-center z-10">
                          <div className="w-2.5 h-2.5 bg-primary-500 rounded-full"></div>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-900">{event.action}</p>
                          {event.details && <p className="text-sm text-slate-600 mt-1">{event.details}</p>}
                          <div className="flex items-center gap-2 mt-2">
                             <Badge variant="default" className="text-[10px] py-0 h-5 bg-slate-100 text-slate-500 border-none">
                                <User size={10} className="mr-1" /> {event.actor}
                             </Badge>
                             <span className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
};
