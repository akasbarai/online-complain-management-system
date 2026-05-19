
import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Select, Modal, Badge, Input, Textarea, Skeleton, Spinner } from '../components/ui';
import { ComplaintService, OfficerService, DeptService, UserService, HierarchyService } from '../services/api';
import { LocationMap } from '../components/LocationMap';
import { Complaint, ComplaintStatus, Status, Priority } from '../types';
import { AlertTriangle, Clock, ArrowRight, CheckSquare, Eye, Search, UserPlus, MapPin, Image as ImageIcon, FileText, Zap, Flag } from 'lucide-react';

export const Complaints = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<any[]>([]);
  
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  const [reassignOfficerId, setReassignOfficerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  
  const [newStatus, setNewStatus] = useState<ComplaintStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  
  const [newPriority, setNewPriority] = useState<Priority | ''>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [complaintsData, officersData, deptsData, usersData, hierarchyData] = await Promise.all([
        ComplaintService.getAll(),
        OfficerService.getAll(),
        DeptService.getAll(),
        UserService.getAll(),
        HierarchyService.getAll()
      ]);
      setComplaints(complaintsData);
      setOfficers(officersData);
      setDepartments(deptsData);
      setUsers(usersData);
      setHierarchyLevels(hierarchyData);
    } catch (err: any) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    try {
      const data = await ComplaintService.getAll();
      setComplaints(data);
    } catch {
      // ignore
    }
  };

  const refreshAttention = () => {
    window.dispatchEvent(new Event('ocms:attention-refresh'));
  };

  const currentDeptLevels = useMemo(() => {
    if (!selectedComplaint) return [];
    return hierarchyLevels.filter(h => h.departmentId === selectedComplaint.departmentId);
  }, [selectedComplaint, hierarchyLevels]);

  const eligibleOfficers = useMemo(() => {
    if (!selectedComplaint) return [];
    const deptOfficers = officers.filter(o => 
      o.departmentId === selectedComplaint.departmentId && 
      o.status === Status.ACTIVE
    );
    return deptOfficers.sort((a, b) => {
      const aIsRecommended = a.hierarchyLevelId === selectedComplaint.currentHierarchyLevelId;
      const bIsRecommended = b.hierarchyLevelId === selectedComplaint.currentHierarchyLevelId;
      if (aIsRecommended && !bIsRecommended) return -1;
      if (!aIsRecommended && bIsRecommended) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [selectedComplaint, officers]);

  const getDesignation = (levelId: string | null) => {
    return currentDeptLevels.find(l => l.id === levelId)?.name || 'General Officer';
  };

  const renderSlaTimer = (c: Complaint) => {
    if (c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED || c.status === ComplaintStatus.REJECTED) {
       return <span className="text-slate-400 text-xs">Completed</span>;
    }
    
    if (c.slaBreached || c.status === ComplaintStatus.ESCALATED) {
       return <span className="text-red-600 font-bold text-xs flex items-center"><AlertTriangle size={12} className="mr-1"/> Breached</span>;
    }

    if (!c.slaDeadline) return <span className="text-slate-400 text-xs">--</span>;

    const now = new Date();
    const deadline = new Date(c.slaDeadline);
    const diffMs = deadline.getTime() - now.getTime();
    
    if (isNaN(diffMs)) return <span className="text-slate-400 text-xs">--</span>;

    if (diffMs < 0) {
       return <span className="text-red-600 font-bold text-xs">Overdue</span>;
    }

    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;
    const label = days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
    const totalHours = diffMs / (1000 * 60 * 60);
    
    let colorClass = "text-green-600";
    if (totalHours < 24) colorClass = "text-yellow-600";
    if (totalHours < 4) colorClass = "text-red-600";

    return (
      <div className={`flex items-center text-xs font-mono font-medium ${colorClass}`}>
        <Clock size={12} className="mr-1" />
        {label}
      </div>
    );
  };

  const handleViewClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsViewOpen(true);
  };

  const handleAssignClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setReassignOfficerId('');
    setReassignReason('');
    setIsReassignOpen(true);
  };

  const handleStatusClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setStatusNotes('');
    setIsStatusOpen(true);
  };

  const handlePriorityClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewPriority(complaint.priority || '');
    setIsPriorityOpen(true);
  };

  const submitReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedComplaint && reassignOfficerId && reassignReason) {
      try {
        await ComplaintService.reassign(selectedComplaint.id, reassignOfficerId, reassignReason);
        setIsReassignOpen(false);
        await refresh();
        refreshAttention();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const submitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedComplaint && newStatus) {
      try {
        await ComplaintService.updateStatus(selectedComplaint.id, newStatus, statusNotes);
        setIsStatusOpen(false);
        await refresh();
        refreshAttention();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const submitPriorityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedComplaint && newPriority) {
      try {
        await ComplaintService.updatePriority(selectedComplaint.id, newPriority as Priority);
        setIsPriorityOpen(false);
        await refresh();
        refreshAttention();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.RESOLVED: return 'success';
      case ComplaintStatus.ESCALATED: return 'danger';
      case ComplaintStatus.IN_PROGRESS: return 'warning';
      case ComplaintStatus.AWAITING_MATERIALS: return 'warning';
      case ComplaintStatus.UNDER_REVIEW: return 'secondary';
      case ComplaintStatus.REJECTED: return 'danger';
      case ComplaintStatus.CLOSED: return 'default';
      default: return 'default';
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (c.isTrashed) return false;

    const safeId = c.id || '';
    const safeTitle = c.title || '';
    const safeDescription = c.description || '';
    
    const matchesSearch = 
      safeId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      safeTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
      safeDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus ? c.status === filterStatus : true;
    const matchesDept = filterDept ? c.departmentId === filterDept : true;
    
    return matchesSearch && matchesStatus && matchesDept;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Complaint Monitor</h1>
        </div>
        <Card>
          <div className="p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Complaint Monitor
        </h1>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Input 
               placeholder="Search Subject or ID..." 
               className="pl-9 bg-white" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           
           <div className="flex flex-col sm:flex-row gap-4 xl:w-auto">
             <div className="relative w-full sm:w-48">
               <Select 
                 className="bg-white" 
                 value={filterDept} 
                 onChange={(e) => setFilterDept(e.target.value)}
               >
                 <option value="">All Departments</option>
                 {departments.map(d => (
                   <option key={d.id} value={d.id}>{d.name}</option>
                 ))}
               </Select>
             </div>
             <div className="relative w-full sm:w-40">
               <Select 
                 className="bg-white" 
                 value={filterStatus} 
                 onChange={(e) => setFilterStatus(e.target.value)}
               >
                 <option value="">All Statuses</option>
                 {Object.values(ComplaintStatus).map(s => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </Select>
             </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">ID</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Subject</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Department</th>
                <th className="px-6 py-4 font-semibold text-slate-700">SLA Time</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Assigned To</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((c) => {
                  const isUnassigned = !c.assignedOfficerId;
                  const deptName = departments.find(d => d.id === c.departmentId)?.name || 'Unknown';
                  
                  return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${c.status === ComplaintStatus.ESCALATED ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-mono text-slate-500">{c.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{c.title}</div>
                      {c.location && <div className="text-xs text-slate-500 flex items-center mt-0.5"><MapPin size={10} className="mr-1"/> {c.location}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {deptName}
                    </td>
                    <td className="px-6 py-4">
                       {renderSlaTimer(c)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusColor(c.status)}>{c.status}</Badge>
                      {c.status === ComplaintStatus.ESCALATED && (
                        <div className="flex items-center text-red-600 text-xs mt-1 font-medium">
                          <AlertTriangle size={12} className="mr-1" /> Auto-Escalated
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isUnassigned ? (
                        <span className="text-slate-400 italic flex items-center gap-1">
                          Unassigned {c.status === ComplaintStatus.ESCALATED ? '(Admin Queue)' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium">
                          {officers.find(o => o.id === c.assignedOfficerId)?.name || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => handleViewClick(c)} title="View Details">
                        <Eye size={14} className="mr-1" /> View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePriorityClick(c)} title="Set Priority">
                        <Flag size={14} className="mr-1" /> Priority
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusClick(c)} title="Update Status">
                        <CheckSquare size={14} className="mr-1" /> Status
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isUnassigned ? 'primary' : 'outline'} 
                        onClick={() => handleAssignClick(c)} 
                        title={isUnassigned ? "Assign Officer" : "Reassign Officer"}
                      >
                        {isUnassigned ? <UserPlus size={14} className="mr-1" /> : <ArrowRight size={14} className="mr-1" />}
                        {isUnassigned ? 'Assign' : 'Reassign'}
                      </Button>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No complaints found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Complaint Details" maxWidth="max-w-3xl">
        {selectedComplaint && (
          <div className="space-y-6">
             <div className="flex justify-between items-start border-b border-slate-100 pb-4">
               <div>
                 <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-lg font-bold text-slate-900">{selectedComplaint.title}</h3>
                   <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 rounded">#{selectedComplaint.id}</span>
                 </div>
                 <p className="text-xs text-slate-500">
                   Submitted on {new Date(selectedComplaint.createdAt).toLocaleString()}
                 </p>
               </div>
               <div className="text-right">
                  <Badge variant={getStatusColor(selectedComplaint.status)} className="text-sm px-3 py-1">{selectedComplaint.status}</Badge>
               </div>
             </div>

             {selectedComplaint.status === ComplaintStatus.ESCALATED && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-3">
                   <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                   <div>
                      <p className="text-red-800 font-semibold text-sm">SLA Breach Detected</p>
                      <p className="text-red-700 text-xs mt-1">
                        This complaint exceeded the mandatory resolution time. It has been automatically escalated to higher management.
                      </p>
                   </div>
                </div>
             )}

             <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Submitted By</span>
                  <div className="font-medium text-slate-800">{users.find(u => u.id === selectedComplaint.userId)?.name || selectedComplaint.userId}</div>
                  <div className="text-xs text-slate-400">{users.find(u => u.id === selectedComplaint.userId)?.email}</div>
                </div>
                <div className="col-span-1">
                   <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Incident Location</span>
                   <div className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                      <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <span className="font-medium text-slate-800">{selectedComplaint.location || 'Location not specified'}</span>
                   </div>
                </div>
                <div>
                   <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Department</span>
                   <span className="font-medium text-slate-800">{departments.find(d => d.id === selectedComplaint.departmentId)?.name || 'Unknown'}</span>
                 </div>
                <div>
                   <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">Assigned To</span>
                   <span className="font-medium text-slate-800">{officers.find(o => o.id === selectedComplaint.assignedOfficerId)?.name || 'Unassigned'}</span>
                </div>
             </div>

             <LocationMap
               location={selectedComplaint.location}
               latitude={selectedComplaint.latitude}
               longitude={selectedComplaint.longitude}
             />

             <div>
               <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                 <FileText size={14} /> Description
               </h4>
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-800 leading-relaxed text-sm">
                 {selectedComplaint.description}
               </div>
             </div>

             <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ImageIcon size={14} /> Submitted Evidence
                </h4>
                {selectedComplaint.imageUrl ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-4">
                     {selectedComplaint.imageUrl.startsWith('data:application/pdf') ? (
                         <div className="text-center p-6 bg-white border border-slate-200 rounded-lg w-full max-w-sm">
                            <FileText className="mx-auto mb-3 text-red-500" size={48} />
                            <p className="font-medium text-slate-800 mb-4">PDF Document Available</p>
                            <Button 
                               onClick={() => {
                                  const win = window.open();
                                  if (win) {
                                     win.document.write('<iframe src="' + selectedComplaint.imageUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                  }
                               }} 
                               variant="outline" 
                               className="w-full relative z-50"
                            >
                               View PDF
                            </Button>
                         </div>
                     ) : (
                         <div className="text-center w-full">
                           <img 
                             src={selectedComplaint.imageUrl} 
                             alt="Evidence" 
                             className="w-full max-h-64 object-contain rounded hover:opacity-90 transition-opacity cursor-pointer shadow-sm mx-auto bg-slate-100" 
                             onClick={() => {
                                 const win = window.open();
                                 if (win) {
                                    win.document.write('<img src="' + selectedComplaint.imageUrl + '" style="max-width: 100%; height: auto;" />');
                                 }
                             }}
                           />
                           <p className="text-xs text-slate-400 mt-2">Click image to view full size</p>
                         </div>
                     )}
                  </div>
                ) : (
                  <div className="p-4 text-center border border-dashed border-slate-300 rounded-lg text-slate-400 text-sm">
                    No image evidence attached.
                  </div>
                )}
             </div>

             <div className="pt-2">
               <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <Clock size={16} className="text-slate-400" /> Activity History
               </h4>
               <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 ml-1">
                  {(selectedComplaint.history || []).map((h, i) => {
                    const safeAction = h.action || '';
                    const isBreach = safeAction.includes('SLA BREACH');
                    return (
                    <div key={i} className="relative pl-8">
                       <div className={`absolute left-0 top-1.5 w-4.5 h-4.5 rounded-full border-2 z-10 ${isBreach ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-primary-500'}`}></div>
                       <div className={`p-3 rounded border shadow-sm ${isBreach ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100'}`}>
                         <p className={`text-sm font-medium ${isBreach ? 'text-red-800' : 'text-slate-900'}`}>{safeAction}</p>
                         <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-slate-500">{h.date ? new Date(h.date).toLocaleString() : 'Unknown Date'}</span>
                            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{h.actor || 'System'}</span>
                         </div>
                       </div>
                    </div>
                  );
                 })}
               </div>
             </div>

             <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setIsViewOpen(false)}>Close</Button>
             </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={isReassignOpen} 
        onClose={() => setIsReassignOpen(false)} 
        title={selectedComplaint?.assignedOfficerId ? "Reassign Complaint" : "Assign Officer"}
      >
        <form onSubmit={submitReassign} className="space-y-4">
           <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm mb-4 space-y-1">
              <p><strong>Complaint ID:</strong> {selectedComplaint?.id}</p>
              <p className="truncate"><strong>Subject:</strong> {selectedComplaint?.title}</p>
              <p className="text-primary-700"><strong>Department:</strong> {departments.find(d => d.id === selectedComplaint?.departmentId)?.name || 'Unknown'}</p>
              
              <div className="mt-2 text-xs text-slate-500 bg-white p-2 border border-slate-100 rounded">
                <span className="font-semibold text-slate-700">Suggestion:</span> Look for officers marked as 
                <span className="font-bold text-green-600"> (Recommended)</span>. They match the hierarchy level required for this complaint.
              </div>
           </div>
           
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Officer <span className="text-red-500">*</span>
              </label>
              <Select required value={reassignOfficerId} onChange={e => setReassignOfficerId(e.target.value)}>
                <option value="">-- Choose an Officer --</option>
                {eligibleOfficers.map(o => {
                  const designation = getDesignation(o.hierarchyLevelId);
                  const isRecommended = o.hierarchyLevelId === selectedComplaint?.currentHierarchyLevelId;
                  return (
                    <option key={o.id} value={o.id} className={isRecommended ? "font-bold text-green-700" : ""}>
                      {o.name} — {designation} {isRecommended ? '(Recommended)' : ''} ({o.jurisdiction || 'General'})
                    </option>
                  );
                })}
              </Select>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assignment Note <span className="text-red-500">*</span>
              </label>
              <Textarea 
                rows={3}
                required
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
                placeholder={selectedComplaint?.assignedOfficerId ? "Reason for reassignment..." : "Instructions for the officer..."}
              />
           </div>

           <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
              <Button type="submit">
                {selectedComplaint?.assignedOfficerId ? "Confirm Reassign" : "Confirm Assignment"}
              </Button>
           </div>
        </form>
      </Modal>

      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title="Update Complaint Status">
        <form onSubmit={submitStatusUpdate} className="space-y-4">
           <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm mb-4">
              <p><strong>Complaint ID:</strong> {selectedComplaint?.id}</p>
              <p className="truncate"><strong>Subject:</strong> {selectedComplaint?.title}</p>
              <p><strong>Current Status:</strong> {selectedComplaint?.status}</p>
           </div>
           
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Status <span className="text-red-500">*</span>
              </label>
              <Select required value={newStatus} onChange={e => setNewStatus(e.target.value as ComplaintStatus)}>
                <option value="">Select Status</option>
                {Object.values(ComplaintStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Resolution Details</label>
              <Textarea 
                rows={3}
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                placeholder="Describe action taken..."
              />
           </div>

           <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsStatusOpen(false)}>Cancel</Button>
              <Button type="submit">Update Status</Button>
           </div>
        </form>
      </Modal>

      <Modal isOpen={isPriorityOpen} onClose={() => setIsPriorityOpen(false)} title="Set Complaint Priority">
        <form onSubmit={submitPriorityUpdate} className="space-y-4">
           <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm mb-4">
              <p><strong>Complaint ID:</strong> {selectedComplaint?.id}</p>
              <p className="truncate"><strong>Current Priority:</strong> {selectedComplaint?.priority || 'Unassigned'}</p>
           </div>
           
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Priority <span className="text-red-500">*</span>
              </label>
              <Select required value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}>
                <option value="">Select Priority</option>
                {Object.values(Priority).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
           </div>

           <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsPriorityOpen(false)}>Cancel</Button>
              <Button type="submit">Set Priority</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
};
