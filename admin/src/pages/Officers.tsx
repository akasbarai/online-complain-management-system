
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select, Modal, Badge, Spinner } from '../components/ui';
import { OfficerService, DeptService, HierarchyService } from '../services/api';
import { Officer, Department, HierarchyLevel, Status } from '../types';
import { UserPlus, Filter, Search, Eye, MailCheck, Mail, CheckCircle, Copy, ExternalLink, Trash2, Key } from 'lucide-react';

export const Officers = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allHierarchyLevels, setAllHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewOfficer, setViewOfficer] = useState<Officer | null>(null);
  
  const [newCredentials, setNewCredentials] = useState<{officer: Officer, password: string} | null>(null);
  
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; link: string; email: string }>({ isOpen: false, link: '', email: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  
  const [formData, setFormData] = useState({
     name: '', email: '', departmentId: '', hierarchyLevelId: '', jurisdiction: ''
  });
  const [availableLevels, setAvailableLevels] = useState<HierarchyLevel[]>([]);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const [officersData, deptsData] = await Promise.all([
        OfficerService.getAll(),
        DeptService.getAll()
      ]);
      setOfficers(officersData);
      setDepartments(deptsData);
      
      let levels: HierarchyLevel[] = [];
      for (const dept of deptsData) {
        const deptLevels = await HierarchyService.getByDept(dept.id);
        levels = [...levels, ...deptLevels];
      }
      setAllHierarchyLevels(levels);
    } catch {
      setOfficers([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ name: '', email: '', departmentId: '', hierarchyLevelId: '', jurisdiction: '' });
    setAvailableLevels([]);
    setIsModalOpen(true);
  };

  const handleDeptSelect = async (deptId: string) => {
    setFormData({ ...formData, departmentId: deptId, hierarchyLevelId: '' });
    if (deptId) {
      const deptLevels = await HierarchyService.getByDept(deptId);
      const activeLevels = deptLevels.filter(h => h.status === Status.ACTIVE);
      const assignedLevelIds = new Set(officers.map(o => o.hierarchyLevelId));
      setAvailableLevels(activeLevels.filter(l => !assignedLevelIds.has(l.id)));
    } else {
      setAvailableLevels([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { officer, password } = await OfficerService.create({
        name: formData.name,
        email: formData.email,
        departmentId: formData.departmentId,
        hierarchyLevelId: formData.hierarchyLevelId || null,
        jurisdiction: formData.jurisdiction,
        role: 'Officer'
      });
      
      setIsModalOpen(false);
      await refresh();
      setNewCredentials({ officer, password });

    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this officer account? This action cannot be undone.")) {
      await OfficerService.delete(id);
      refresh();
    }
  };

  const handleResetPassword = async (id: string, email: string) => {
    const link = await OfficerService.resetPassword(id);
    if (link) {
      setResetModal({ isOpen: true, link, email });
    }
  };

  const getEmailData = () => {
    if (!newCredentials) return { subject: '', body: '', to: '' };
    const { officer, password } = newCredentials;
    const subject = "Welcome to OCMS - Your Account Details";
    const body = `Hello ${officer.name},\n\nYour account has been successfully created in the OCMS Portal.\n\nHere are your temporary login credentials:\nEmail: ${officer.email}\nPassword: ${password}\n\nPlease login and change your password immediately.\n\nRegards,\nCivicResolve Admin Team`;
    return { subject, body, to: officer.email };
  };

  const getResetEmailData = () => {
    const { link, email } = resetModal;
    const subject = "Password Reset Request - OCMS";
    const body = `Hello,\n\nA password reset was requested for your Officer account.\n\nClick the link below to set a new password:\n${link}\n\nIf you did not request this, please contact the administrator immediately.\n\nRegards,\nCivicResolve Admin Team`;
    return { subject, body, to: email };
  };

  const handleDefaultMail = (data: {to: string, subject: string, body: string}) => {
    window.location.href = `mailto:${data.to}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
  };

  const handleGmail = (data: {to: string, subject: string, body: string}) => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${data.to}&su=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleCopyContent = (data: {to: string, subject: string, body: string}) => {
    const content = `To: ${data.to}\nSubject: ${data.subject}\n\n${data.body}`;
    navigator.clipboard.writeText(content);
    alert('Email content copied to clipboard!');
  };

  const copyPassword = () => {
    if (newCredentials) {
      navigator.clipboard.writeText(newCredentials.password);
      alert('Password copied to clipboard');
    }
  };

  const getHierarchyName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return allHierarchyLevels.find(l => l.id === id)?.name || 'Unknown';
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown';

  const filteredOfficers = officers.filter(officer => {
    const matchesSearch = 
      (officer.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (officer.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (officer.jurisdiction && officer.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDept = filterDeptId ? officer.departmentId === filterDeptId : true;

    return matchesSearch && matchesDept;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Officer Management</h1>
          <p className="text-slate-500">Create accounts and assign hierarchy levels</p>
        </div>
        <Button onClick={handleOpenModal}>
          <UserPlus size={16} className="mr-2" /> Register Officer
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Input 
               placeholder="Search officers..." 
               className="pl-9 bg-white" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           <div className="relative w-full md:w-48">
             <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Select 
               className="pl-9 bg-white" 
               value={filterDeptId} 
               onChange={(e) => setFilterDeptId(e.target.value)}
             >
               <option value="">All Departments</option>
               {departments.map(d => (
                 <option key={d.id} value={d.id}>{d.name}</option>
               ))}
             </Select>
           </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Officer Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Department</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Hierarchy Level</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Jurisdiction</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOfficers.map((officer) => (
              <tr key={officer.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {officer.profilePhoto ? (
                      <img src={officer.profilePhoto} alt={`${officer.name} profile`} className="w-8 h-8 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs uppercase">
                        {officer.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-900">{officer.name}</div>
                      <a href={`mailto:${officer.email}`} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 hover:underline">
                        {officer.email}
                      </a>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{getDeptName(officer.departmentId)}</td>
                <td className="px-6 py-4">
                  <Badge variant="default">{getHierarchyName(officer.hierarchyLevelId)}</Badge>
                </td>
                <td className="px-6 py-4 text-slate-500">{officer.jurisdiction || 'N/A'}</td>
                <td className="px-6 py-4">
                  <Badge variant={officer.status === Status.ACTIVE ? 'success' : 'danger'}>{officer.status}</Badge>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setViewOfficer(officer)} title="View Profile">
                    <Eye size={14} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleResetPassword(officer.id, officer.email)}
                    title="Send Password Reset"
                  >
                    <Key size={14} />
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleDelete(officer.id)}
                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    title="Delete Account"
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            {filteredOfficers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No officers found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Officer">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-4 text-sm text-blue-800 flex items-start gap-2">
            <MailCheck size={18} className="mt-0.5 shrink-0" />
            <p>A temporary password will be generated for the officer. You will be able to email it to them in the next step.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <Select required value={formData.departmentId} onChange={e => handleDeptSelect(e.target.value)}>
               <option value="">Select Department</option>
               {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hierarchy Level <span className="text-red-500">*</span>
                </label>
                <Select required value={formData.hierarchyLevelId} onChange={e => setFormData({...formData, hierarchyLevelId: e.target.value})} disabled={!formData.departmentId}>
                   <option value="">Select Level</option>
                   {availableLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jurisdiction (Optional)</label>
                <Input value={formData.jurisdiction} onChange={e => setFormData({...formData, jurisdiction: e.target.value})} placeholder="e.g. Ward 12" />
             </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Account</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!newCredentials} onClose={() => setNewCredentials(null)} title="Account Created Successfully">
        {newCredentials && (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-800 p-4 rounded border border-green-200 flex items-start gap-3">
                <CheckCircle className="shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium">Officer Registered</p>
                  <p className="text-sm mt-1">The account for <strong>{newCredentials.officer.name}</strong> is active.</p>
                </div>
            </div>
            
            <div className="p-4 bg-slate-100 rounded border border-slate-200">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Temporary Credentials</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-500 text-sm">Email:</span>
                      <span className="font-mono font-medium">{newCredentials.officer.email}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-500 text-sm">Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-red-600">{newCredentials.password}</span>
                        <button onClick={copyPassword} className="text-slate-400 hover:text-slate-600" title="Copy Password">
                          <Copy size={14} />
                        </button>
                      </div>
                  </div>
                </div>
            </div>

            <div className="pt-2">
               <p className="text-sm font-medium text-slate-700 mb-2">Send Login Details via:</p>
               <div className="grid grid-cols-1 gap-2">
                  <Button onClick={() => handleGmail(getEmailData())} className="w-full bg-red-600 hover:bg-red-700 text-white border-transparent">
                     <Mail size={16} className="mr-2" /> Open in Gmail
                  </Button>
                  <Button onClick={() => handleDefaultMail(getEmailData())} variant="outline" className="w-full">
                     <ExternalLink size={16} className="mr-2" /> Open Default Mail App
                  </Button>
                  <Button onClick={() => handleCopyContent(getEmailData())} variant="ghost" className="w-full text-slate-500">
                     <Copy size={16} className="mr-2" /> Copy Email Content to Clipboard
                  </Button>
               </div>
            </div>
            
            <div className="flex justify-end pt-2">
               <Button variant="ghost" onClick={() => setNewCredentials(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={resetModal.isOpen} onClose={() => setResetModal({...resetModal, isOpen: false})} title="Reset Officer Password">
        <div className="space-y-4">
           <div className="p-4 bg-slate-50 rounded border border-slate-200 text-sm">
             <p className="text-slate-500 mb-1">To:</p>
             <p className="font-medium text-slate-900 mb-2">{resetModal.email}</p>
             <p className="text-slate-500 mb-1">Generated Link:</p>
             <p className="font-mono text-xs text-blue-600 break-all bg-white p-2 rounded border border-blue-100">{resetModal.link}</p>
           </div>
           
           <div className="pt-2 space-y-3">
              <p className="text-sm font-medium text-slate-700">Send Link via:</p>
              <Button onClick={() => handleGmail(getResetEmailData())} className="w-full bg-red-600 hover:bg-red-700 text-white border-transparent">
                  <Mail size={16} className="mr-2" /> Open in Gmail
              </Button>
              <Button onClick={() => handleDefaultMail(getResetEmailData())} variant="outline" className="w-full">
                  <ExternalLink size={16} className="mr-2" /> Open Default Mail App
              </Button>
              <Button onClick={() => handleCopyContent(getResetEmailData())} variant="ghost" className="w-full text-slate-500">
                  <Copy size={16} className="mr-2" /> Copy Email Content to Clipboard
              </Button>
           </div>
           
           <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setResetModal({...resetModal, isOpen: false})}>Done</Button>
           </div>
        </div>
      </Modal>

      <Modal isOpen={!!viewOfficer} onClose={() => setViewOfficer(null)} title="Officer Profile">
        {viewOfficer && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
              {viewOfficer.profilePhoto ? (
                <img src={viewOfficer.profilePhoto} alt={`${viewOfficer.name}`} className="h-12 w-12 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                  {viewOfficer.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-slate-900">{viewOfficer.name}</h3>
                <div className="flex items-center gap-2">
                   <p className="text-slate-500 text-sm">{viewOfficer.email}</p>
                   <a href={`mailto:${viewOfficer.email}`} className="text-primary-600 hover:bg-primary-50 p-1 rounded transition-colors" title="Send Email">
                     <Mail size={14} />
                   </a>
                </div>
              </div>
              <div className="ml-auto">
                 <Badge variant={viewOfficer.status === Status.ACTIVE ? 'success' : 'danger'}>{viewOfficer.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                 <label className="text-slate-500 text-xs uppercase tracking-wide">Department</label>
                 <p className="font-medium text-slate-900">{getDeptName(viewOfficer.departmentId)}</p>
              </div>
               <div>
                 <label className="text-slate-500 text-xs uppercase tracking-wide">Designation</label>
                 <p className="font-medium text-slate-900">{getHierarchyName(viewOfficer.hierarchyLevelId)}</p>
              </div>
              <div>
                 <label className="text-slate-500 text-xs uppercase tracking-wide">Jurisdiction</label>
                 <p className="font-medium text-slate-900">{viewOfficer.jurisdiction || 'N/A'}</p>
              </div>
               <div>
                 <label className="text-slate-500 text-xs uppercase tracking-wide">Role</label>
                 <p className="font-medium text-slate-900">{viewOfficer.role}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="secondary" onClick={() => setViewOfficer(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
