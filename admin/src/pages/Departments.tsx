
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Badge, Spinner } from '../components/ui';
import { DeptService } from '../services/api';
import { Department, Status } from '../types';
import { Edit2, Power, Search, Eye, Trash2 } from 'lucide-react';

export const Departments = () => {
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  const [viewDept, setViewDept] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const data = await DeptService.getAll();
      setDepts(data);
    } catch {
      setDepts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await DeptService.update(editingDept.id, formData);
      } else {
        await DeptService.create({ name: formData.name, description: formData.description, status: Status.ACTIVE });
      }
      setIsModalOpen(false);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description });
    setIsModalOpen(true);
  };

  const toggleStatus = async (id: string) => {
    await DeptService.toggleStatus(id);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this department? This action cannot be undone and may affect associated hierarchy levels.")) {
      await DeptService.delete(id);
      refresh();
    }
  };

  const filteredDepts = depts.filter(dept => 
    (dept.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (dept.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-slate-900">Manage Departments</h1>
          <p className="text-slate-500">Create and configure organizational departments</p>
        </div>
        <Button onClick={openAdd}>+ Add Department</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
           <div className="relative w-full max-w-sm">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <Input 
               placeholder="Search departments..." 
               className="pl-9 bg-white" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Department Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Description</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDepts.map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{dept.name}</td>
                <td className="px-6 py-4 text-slate-500">{dept.description}</td>
                <td className="px-6 py-4">
                  <Badge variant={dept.status === Status.ACTIVE ? 'success' : 'danger'}>{dept.status}</Badge>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setViewDept(dept)} title="View">
                    <Eye size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(dept)} title="Edit">
                    <Edit2 size={14} />
                  </Button>
                  <Button 
                    variant={dept.status === Status.ACTIVE ? 'danger' : 'secondary'} 
                    size="sm" 
                    onClick={() => toggleStatus(dept.id)}
                    title={dept.status === Status.ACTIVE ? 'Deactivate' : 'Activate'}
                  >
                    <Power size={14} />
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleDelete(dept.id)}
                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            {filteredDepts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No departments found matching "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingDept ? 'Edit Department' : 'Add New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <Input 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Department</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewDept} onClose={() => setViewDept(null)} title="Department Details">
        {viewDept && (
          <div className="space-y-6">
             <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900">{viewDept.name}</h3>
                <Badge variant={viewDept.status === Status.ACTIVE ? 'success' : 'danger'}>{viewDept.status}</Badge>
             </div>
             
             <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Description</h4>
                <p className="text-slate-800 bg-slate-50 p-3 rounded border border-slate-100">{viewDept.description}</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="text-2xl font-bold text-blue-700">{viewDept.stats?.complaints || 0}</div>
                  <div className="text-xs font-medium text-blue-600 uppercase">Total Complaints</div>
               </div>
               <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <div className="text-2xl font-bold text-purple-700">{viewDept.stats?.officers || 0}</div>
                  <div className="text-xs font-medium text-purple-600 uppercase">Active Officers</div>
               </div>
             </div>

             <div className="flex justify-end pt-2">
               <Button variant="secondary" onClick={() => setViewDept(null)}>Close</Button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
