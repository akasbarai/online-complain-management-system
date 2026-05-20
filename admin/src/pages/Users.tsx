
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Select, Modal, Spinner } from '../components/ui';
import { UserService, ComplaintService } from '../services/api';
import { Status, User, Complaint } from '../types';
import { RefreshCw, Ban, CheckCircle, Search, Filter, Eye, UserPlus, XCircle, Mail, Copy, ExternalLink, Phone, MapPin, Trash2, FileCheck, ImageIcon } from 'lucide-react';

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userComplaints, setUserComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [viewUser, setViewUser] = useState<User | null>(null);

  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    to: string;
    subject: string;
    body: string;
    actionType: 'Verify' | 'Reset';
  }>({ isOpen: false, to: '', subject: '', body: '', actionType: 'Verify' });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const data = await UserService.getAll();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAttention = () => {
    window.dispatchEvent(new Event('ocms:attention-refresh'));
  };

  const handleViewUser = async (user: User) => {
    setViewUser(user);
    try {
      const allComplaints = await ComplaintService.getAll();
      setUserComplaints(allComplaints.filter(c => c.userId === user.id));
    } catch {
      setUserComplaints([]);
    }
  };

  const toggleStatus = async (id: string, currentStatus: Status) => {
    const newStatus = currentStatus === Status.ACTIVE ? Status.BLOCKED : Status.ACTIVE;
    try {
      await UserService.toggleStatus(id, newStatus);
      await refresh();
      refreshAttention();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const result = await UserService.verifyUser(id);
      await refresh();
      refreshAttention();

      alert(result.emailSent
        ? 'User verified and Gmail acknowledgement sent.'
        : `User verified, but Gmail acknowledgement was not sent. ${result.emailError || 'Check API Gmail settings.'}`
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  const handleReject = async (id: string) => {
    if(window.confirm("Are you sure you want to reject this registration? This will delete the request.")) {
      try {
        await UserService.delete(id);
        await refresh();
        refreshAttention();
      } catch (err: any) {
        alert(err.message);
      }
    }
  }

  const handleDelete = async (id: string) => {
    if(window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      try {
        await UserService.delete(id);
        await refresh();
        refreshAttention();
      } catch (err: any) {
        alert(err.message);
      }
    }
  }

  const handlePasswordReset = async (id: string, email: string) => {
    try {
      const link = await UserService.resetPassword(id);
      await refresh();
      refreshAttention();
      
      if (link) {
        const subject = "Password Reset Request - OCMS";
        const body = `Hello,\n\nA password reset was requested for your account.\n\nClick here to reset: ${link}\n\nIf you did not request this, please ignore this email.\n\nRegards,\nAdmin`;

        setEmailModal({
          isOpen: true,
          to: email,
          subject,
          body,
          actionType: 'Reset'
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openGmail = () => {
    const { to, subject, body } = emailModal;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const openDefaultMail = () => {
    const { to, subject, body } = emailModal;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyEmail = () => {
    const { to, subject, body } = emailModal;
    const content = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(content);
    alert('Email content copied to clipboard.');
  };

  const pendingCount = users.filter(u => u.status === Status.PENDING).length;
  const resetReqCount = users.filter(u => u.passwordResetRequested).length;

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'pending') {
      return matchesSearch && u.status === Status.PENDING;
    }
    
    if (activeTab === 'all') {
      const matchesFilter = filterStatus ? u.status === filterStatus : u.status !== Status.PENDING;
      return matchesSearch && matchesFilter;
    }
    
    return false;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">View and verify citizen registrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
        </div>
      </div>
      
      <div className="flex space-x-1 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'all' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <span>User Directory</span>
          {resetReqCount > 0 && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full" title="Password Reset Requests">{resetReqCount}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'pending' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <span>Pending Approvals</span>
          {pendingCount > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
        </button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Input 
               placeholder="Search name or email..." 
               className="pl-9 bg-white" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           
           {activeTab === 'all' && (
             <div className="relative w-full md:w-48">
               <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
               <Select 
                 className="pl-9 bg-white" 
                 value={filterStatus} 
                 onChange={(e) => setFilterStatus(e.target.value)}
               >
                 <option value="">All Active/Blocked</option>
                 <option value={Status.ACTIVE}>Active</option>
                 <option value={Status.BLOCKED}>Blocked</option>
               </Select>
             </div>
           )}
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">User Details</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Contact Info</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Registered</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        {user?.name ? user.name.charAt(0) : '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{user.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 font-mono">ID: {user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-sm">
                    <a href={`mailto:${user.email}`} className="text-slate-600 hover:text-primary-600 flex items-center gap-1">
                      <Mail size={12} /> {user.email}
                    </a>
                    {user.mobile && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Phone size={12} /> {user.mobile}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">{user.registeredDate ? new Date(user.registeredDate).toLocaleDateString() : 'Unknown'}</td>
                <td className="px-6 py-4">
                  <Badge variant={user.status === Status.ACTIVE ? 'success' : user.status === Status.PENDING ? 'warning' : 'danger'}>{user.status}</Badge>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {activeTab === 'all' ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)} title="View">
                        <Eye size={14} />
                      </Button>
                      <Button 
                        variant={user.passwordResetRequested ? "primary" : "outline"} 
                        size="sm" 
                        onClick={() => handlePasswordReset(user.id, user.email)} 
                        title="Reset Password"
                      >
                        <RefreshCw size={14} className={user.passwordResetRequested ? "animate-spin-slow" : ""} />
                        {user.passwordResetRequested && <span className="ml-1 text-xs">Reset Req</span>}
                      </Button>
                      <Button 
                        variant={user.status === Status.ACTIVE ? 'danger' : 'secondary'} 
                        size="sm"
                        onClick={() => toggleStatus(user.id, user.status)}
                        title={user.status === Status.ACTIVE ? 'Block User' : 'Unblock User'}
                      >
                        {user.status === Status.ACTIVE ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDelete(user.id)}
                        className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleVerify(user.id)}>
                        <CheckCircle size={14} className="mr-1" /> Verify & Email
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleReject(user.id)}>
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                        <Eye size={14} />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  {activeTab === 'pending' ? (
                     <div className="flex flex-col items-center">
                        <UserPlus size={48} className="text-slate-300 mb-2" />
                        <p>No new user registrations pending.</p>
                     </div>
                  ) : (
                     <p>No users found matching filters.</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title="User Profile Details">
         {viewUser && (
            <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                   <div className="flex items-center space-x-3">
                      {viewUser.profilePicture ? (
                        <img src={viewUser.profilePicture} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-2xl">
                          {viewUser?.name ? viewUser.name.charAt(0) : '?'}
                        </div>
                      )}
                      <div>
                         <h3 className="text-xl font-bold text-slate-900">{viewUser.name || 'Unknown'}</h3>
                         <div className="flex items-center gap-2 mt-1">
                            <Badge variant={viewUser.status === Status.ACTIVE ? 'success' : 'danger'}>{viewUser.status}</Badge>
                            <span className="text-xs text-slate-500">ID: {viewUser.id}</span>
                         </div>
                      </div>
                   </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                   <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                     <FileCheck size={16} /> Identity Verification
                   </h4>
                   <div className="grid grid-cols-1 gap-4">
                      <div>
                         <span className="block text-blue-600 text-xs mb-2">Submitted ID Card / Document</span>
                         {viewUser.idCardUrl ? (
                           <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                             {viewUser.idCardUrl.startsWith('data:application/pdf') ? (
                                <div className="p-8 text-center bg-slate-50 flex flex-col items-center">
                                   <FileCheck className="text-blue-500 mb-3" size={48} />
                                   <p className="font-medium text-slate-800 mb-4">PDF Document Verification</p>
                                   <Button 
                                      variant="outline" 
                                      className="relative z-50 text-blue-600 border-blue-200 hover:bg-blue-50"
                                      onClick={() => {
                                         const win = window.open();
                                         if (win) {
                                            win.document.write('<iframe src="' + viewUser.idCardUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                         }
                                      }}
                                   >
                                      View PDF Document
                                   </Button>
                                </div>
                             ) : (
                                <>
                                  <img 
                                    src={viewUser.idCardUrl} 
                                    alt="User ID Card" 
                                    className="w-full max-h-48 object-contain bg-white rounded cursor-zoom-in"
                                    onClick={() => {
                                        const win = window.open();
                                        if (win) {
                                           win.document.write('<img src="' + viewUser.idCardUrl + '" style="max-width: 100%; height: auto;" />');
                                        }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                    <span className="text-white text-sm font-medium">Click to Open Full Size</span>
                                  </div>
                                </>
                             )}
                           </div>
                         ) : (
                           <div className="p-4 bg-slate-100 text-slate-500 text-center rounded border border-dashed border-slate-300">
                             <p>ID Card Image Unavailable</p>
                             <p className="text-xs mt-1 text-slate-400">(User did not provide an ID)</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Contact & Address</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                         <span className="block text-slate-400 text-xs mb-1">Email</span>
                         <div className="flex items-center text-slate-900"><Mail size={14} className="mr-2 text-slate-400"/> {viewUser.email}</div>
                      </div>
                      <div>
                         <span className="block text-slate-400 text-xs mb-1">Mobile</span>
                         <div className="flex items-center text-slate-900"><Phone size={14} className="mr-2 text-slate-400"/> {viewUser.mobile || 'N/A'}</div>
                      </div>
                      <div className="md:col-span-2">
                         <span className="block text-slate-400 text-xs mb-1">Residential Address</span>
                         <div className="flex items-center text-slate-900"><MapPin size={14} className="mr-2 text-slate-400"/> {viewUser.address || 'N/A'}</div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="bg-white p-3 border border-slate-100 rounded">
                     <span className="block text-slate-500 text-xs mb-1">Registered On</span>
                     <p className="font-medium text-slate-900">{viewUser.registeredDate ? new Date(viewUser.registeredDate).toLocaleDateString() : 'Unknown'}</p>
                   </div>
                   <div className="bg-white p-3 border border-slate-100 rounded">
                     <span className="block text-slate-500 text-xs mb-1">Total Complaints</span>
                     <p className="font-medium text-slate-900">{userComplaints.length}</p>
                   </div>
                </div>

                <div className="flex justify-end pt-2 gap-3">
                   {viewUser.status === Status.PENDING && (
                      <>
                         <Button 
                           variant="danger" 
                           onClick={() => {
                              handleReject(viewUser.id);
                              setViewUser(null);
                           }}
                         >
                           <XCircle size={16} className="mr-2" /> Reject Registration
                         </Button>
                         <Button 
                           variant="success" 
                           onClick={() => {
                              handleVerify(viewUser.id);
                              setViewUser(null);
                           }}
                         >
                           <CheckCircle size={16} className="mr-2" /> Verify & Approve
                         </Button>
                      </>
                   )}
                   <Button variant={viewUser.status === Status.PENDING ? "secondary" : "primary"} onClick={() => setViewUser(null)}>Close</Button>
                </div>
            </div>
         )}
      </Modal>

      <Modal isOpen={emailModal.isOpen} onClose={() => setEmailModal({...emailModal, isOpen: false})} title={`Send ${emailModal.actionType} Email`}>
        <div className="space-y-4">
           <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-green-800 text-sm flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {emailModal.actionType === 'Reset' ? 'Password Reset Link Created' : 'Email Ready'}
                </p>
                <p>
                  {emailModal.actionType === 'Reset'
                    ? 'Send this reset link to the user so they can choose a new password.'
                    : 'Send this message to the user.'}
                </p>
              </div>
           </div>
           <div className="p-4 bg-slate-50 rounded border border-slate-200 text-sm">
             <p className="text-slate-500 mb-1">Recipient:</p>
             <p className="font-medium text-slate-900 mb-2">{emailModal.to}</p>
             <p className="text-slate-500 mb-1">Subject:</p>
             <p className="font-medium text-slate-900">{emailModal.subject}</p>
           </div>
           
           <div className="pt-2 space-y-3">
              <Button onClick={openGmail} className="w-full bg-red-600 hover:bg-red-700 text-white border-transparent">
                  <Mail size={16} className="mr-2" /> Open in Gmail
              </Button>
              <Button onClick={openDefaultMail} variant="outline" className="w-full">
                  <ExternalLink size={16} className="mr-2" /> Open Default Mail App
              </Button>
              <Button onClick={copyEmail} variant="ghost" className="w-full text-slate-500">
                  <Copy size={16} className="mr-2" /> Copy Email Content to Clipboard
              </Button>
           </div>
           
           <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setEmailModal({...emailModal, isOpen: false})}>Done</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};
