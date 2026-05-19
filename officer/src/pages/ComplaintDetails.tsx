
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Modal, Textarea, Spinner } from '../components/ui';
import { ComplaintService } from '../services/api';
import { LocationMap } from '../components/LocationMap';
import { Complaint, ComplaintStatus } from '../types';
import { ArrowLeft, MapPin, Calendar, CheckCircle, ArrowUpRight, Ban, Shield, Clock, FileText } from 'lucide-react';

export const ComplaintDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: 'Resolve' | 'Escalate' | 'Reject' | 'Wait' | null }>({ isOpen: false, type: null });
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (id) {
      ComplaintService.getById(id)
        .then(data => setComplaint(data))
        .catch(() => navigate('/complaints'))
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

  const handleAction = async () => {
    if (!complaint || !actionModal.type) return;

    try {
      if (actionModal.type === 'Resolve') {
        await ComplaintService.updateStatus(complaint.id, ComplaintStatus.RESOLVED, remarks);
      } else if (actionModal.type === 'Escalate') {
        await ComplaintService.escalate(complaint.id, remarks);
      } else if (actionModal.type === 'Wait') {
        await ComplaintService.updateStatus(complaint.id, ComplaintStatus.AWAITING_MATERIALS, remarks);
      } else if (actionModal.type === 'Reject') {
        await ComplaintService.updateStatus(complaint.id, ComplaintStatus.REJECTED, remarks);
      }
      
      setActionModal({ isOpen: false, type: null });
      setRemarks('');
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startProgress = async () => {
    if (complaint) {
      try {
        await ComplaintService.updateStatus(complaint.id, ComplaintStatus.IN_PROGRESS, 'Officer started working on the complaint.');
        refresh();
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
      <Button variant="ghost" onClick={() => navigate('/complaints')} className="pl-0">
        <ArrowLeft size={16} className="mr-2" /> Back to List
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card className="p-6">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h1 className="text-xl font-bold text-slate-900">{complaint.title}</h1>
                   <p className="font-mono text-sm text-slate-500 mt-1">ID: {complaint.id}</p>
                </div>
                <Badge variant={complaint.status === ComplaintStatus.RESOLVED ? 'success' : complaint.status === ComplaintStatus.ESCALATED || complaint.status === ComplaintStatus.REJECTED ? 'danger' : complaint.status === ComplaintStatus.UNDER_REVIEW ? 'secondary' : 'warning'}>{complaint.status}</Badge>
             </div>
             
             <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6">
               <div className="bg-white p-2 rounded-full border border-slate-200 text-slate-500">
                 <Shield size={18} />
               </div>
               <div>
                 <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Reported By</p>
                 <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">Citizen (Confidential)</p>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 px-1.5 rounded font-mono">ID: {complaint.userId}</span>
                 </div>
               </div>
             </div>

             <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 shadow-sm">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Description</h4>
                <p className="text-slate-800 leading-relaxed text-sm">{complaint.description}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                   <p className="text-slate-500 text-xs uppercase mb-1">Location</p>
                   <p className="font-medium flex items-center"><MapPin size={14} className="mr-1 text-slate-400"/> {complaint.location}</p>
                </div>
                <div>
                   <p className="text-slate-500 text-xs uppercase mb-1">Due Date</p>
                   <p className="font-medium flex items-center"><Calendar size={14} className="mr-1 text-slate-400"/> {new Date(complaint.slaDeadline || '').toLocaleDateString()}</p>
                </div>
             </div>
           </Card>

           <LocationMap
             location={complaint.location}
             latitude={complaint.latitude}
             longitude={complaint.longitude}
           />

           {complaint.imageUrl && (
             <Card className="p-6">
                <h3 className="font-semibold mb-4">Evidence</h3>
                {complaint.imageUrl.startsWith('data:application/pdf') ? (
                    <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-lg">
                       <FileText className="mx-auto mb-3 text-red-500" size={48} />
                       <p className="font-medium text-slate-800 mb-4">PDF Document</p>
                       <Button 
                          onClick={() => {
                             const win = window.open();
                             if (win) {
                                win.document.write('<iframe src="' + complaint.imageUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                             }
                          }} 
                          variant="outline"
                       >
                          View PDF
                       </Button>
                    </div>
                ) : (
                    <img 
                       src={complaint.imageUrl} 
                       alt="Evidence" 
                       className="w-full rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                       onClick={() => {
                          const win = window.open();
                          if (win) {
                             win.document.write('<img src="' + complaint.imageUrl + '" style="max-width: 100%; height: auto;" />');
                          }
                       }}
                    />
                )}
             </Card>
           )}
           
           <Card className="p-6">
             <h3 className="font-semibold mb-4">Timeline</h3>
             <div className="space-y-6 pl-2 border-l-2 border-slate-100">
                {complaint.history.map((h, i) => (
                  <div key={i} className="relative pl-6">
                     <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                     <p className="text-sm font-medium text-slate-900">{h.action}</p>
                     <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>{h.actor}</span>
                        <span>{new Date(h.date).toLocaleString()}</span>
                     </div>
                  </div>
                ))}
             </div>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-6 sticky top-6">
              <h3 className="font-semibold mb-4 text-slate-900">Actions</h3>
              
              {complaint.status === ComplaintStatus.ASSIGNED && (
                <Button className="w-full mb-3" onClick={startProgress}>
                   Start Progress
                </Button>
              )}

              {complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED && (
                 <div className="space-y-3">
                    <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700" onClick={() => setActionModal({ isOpen: true, type: 'Resolve' })}>
                       <CheckCircle size={16} className="mr-2" /> Mark Resolved
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={() => setActionModal({ isOpen: true, type: 'Escalate' })}>
                       <ArrowUpRight size={16} className="mr-2" /> Escalate
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={() => setActionModal({ isOpen: true, type: 'Wait' })}>
                       <Clock size={16} className="mr-2" /> Await Materials
                    </Button>
                    <Button variant="danger" className="w-full bg-white text-red-600 border border-red-200 hover:bg-red-50" onClick={() => setActionModal({ isOpen: true, type: 'Reject' })}>
                       <Ban size={16} className="mr-2" /> Reject Complaint
                    </Button>
                 </div>
              )}
              
              {complaint.status === ComplaintStatus.RESOLVED && (
                 <div className="bg-green-50 text-green-800 p-4 rounded text-center text-sm">
                    This complaint has been resolved.
                 </div>
              )}
           </Card>
        </div>
      </div>

      <Modal 
         isOpen={actionModal.isOpen} 
         onClose={() => setActionModal({ isOpen: false, type: null })} 
         title={`${actionModal.type} Complaint`}
      >
         <div className="space-y-4">
            <p className="text-sm text-slate-600">
               {actionModal.type === 'Escalate' && "This will send the complaint to your superior. Please provide a reason."}
               {actionModal.type === 'Resolve' && "Confirm that you have fixed the issue. Add any closing remarks."}
               {actionModal.type === 'Wait' && "Explain what materials or information are missing to proceed."}
               {actionModal.type === 'Reject' && "Are you sure? This will close the ticket as invalid. Please explain why."}
            </p>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Remarks / Reason</label>
               <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Type here..." />
            </div>
            <div className="flex justify-end gap-2">
               <Button variant="ghost" onClick={() => setActionModal({ isOpen: false, type: null })}>Cancel</Button>
               <Button onClick={handleAction}>Confirm {actionModal.type}</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};
