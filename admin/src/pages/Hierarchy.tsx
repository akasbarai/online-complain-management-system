
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Modal, Badge, Spinner } from '../components/ui';
import { DeptService, HierarchyService, OfficerService } from '../services/api';
import { Department, HierarchyLevel, Status } from '../types';
import { GitBranch, Plus, Edit3, Lock, Trash2 } from 'lucide-react';

export const Hierarchy = () => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [hierarchy, setHierarchy] = useState<HierarchyLevel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([DeptService.getAll(), OfficerService.getAll()])
      .then(([depts, officerData]) => {
        setDepartments(depts.filter(d => d.status === Status.ACTIVE));
        setOfficers(officerData);
      })
      .catch(() => {
        setDepartments([]);
        setOfficers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<HierarchyLevel | null>(null);
  const [newNodeParentId, setNewNodeParentId] = useState<string | null>(null);
  const [nodeName, setNodeName] = useState('');

  const handleDeptChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value;
    setSelectedDeptId(deptId);
    if (deptId) {
      try {
        setHierarchy(await HierarchyService.getByDept(deptId));
      } catch {
        setHierarchy([]);
      }
    } else {
      setHierarchy([]);
    }
  };

  const refresh = async () => {
    if (selectedDeptId) {
      setHierarchy(await HierarchyService.getByDept(selectedDeptId));
    }
  };

  const refreshAttention = () => {
    window.dispatchEvent(new Event('ocms:attention-refresh'));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNode) {
        await HierarchyService.update(editingNode.id, { name: nodeName });
        setEditingNode(null);
      } else {
        await HierarchyService.create({
          departmentId: selectedDeptId,
          name: nodeName,
          parentId: newNodeParentId
        });
      }
      setNewNodeParentId(null);
      setIsModalOpen(false);
      await refresh();
      refreshAttention();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openAdd = (parentId: string | null) => {
    setEditingNode(null);
    setNewNodeParentId(parentId);
    setNodeName('');
    setIsModalOpen(true);
  };

  const openEdit = (node: HierarchyLevel) => {
    setEditingNode(node);
    setNodeName(node.name);
    setIsModalOpen(true);
  };

  const toggleNodeStatus = async (id: string) => {
    try {
      await HierarchyService.toggleStatus(id);
      await refresh();
      refreshAttention();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this hierarchy level?")) {
      try {
        await HierarchyService.delete(id);
        await refresh();
        refreshAttention();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Recursive Tree Component
  const TreeNode: React.FC<{ node: HierarchyLevel }> = ({ node }) => {
    const children = hierarchy.filter(h => h.parentId === node.id);
    const assignedOfficers = officers.filter(o => o.hierarchyLevelId === node.id && o.status === Status.ACTIVE);
    const assignedOfficerName = assignedOfficers.length > 0 ? assignedOfficers[0].name : 'Unassigned';

    return (
      <div className="flex flex-col items-center">
        <div className={`
          relative flex flex-col items-center p-4 border rounded-lg bg-white shadow-sm min-w-[200px] transition-all
          ${node.status === Status.INACTIVE ? 'border-red-200 bg-red-50 opacity-75' : 'border-slate-200'}
        `}>
          <div className="font-semibold text-slate-800">{node.name}</div>
          <div className="text-xs font-medium text-primary-600 mt-1">{assignedOfficerName}</div>
          <Badge variant={node.status === Status.ACTIVE ? 'success' : 'danger'} className="mt-2">
            {node.status}
          </Badge>
          
          <div className="flex space-x-2 mt-3">
             <button onClick={() => openEdit(node)} className="p-1 hover:bg-slate-100 rounded text-slate-600" title="Edit">
                <Edit3 size={14} />
             </button>
             <button onClick={() => toggleNodeStatus(node.id)} className="p-1 hover:bg-red-50 rounded text-red-600" title="Toggle Status">
                <Lock size={14} />
             </button>
             <button onClick={() => handleDelete(node.id)} className="p-1 hover:bg-red-50 rounded text-red-600" title="Delete">
                <Trash2 size={14} />
             </button>
             {node.status === Status.ACTIVE && (
               <button onClick={() => openAdd(node.id)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Add Child">
                  <Plus size={14} />
               </button>
             )}
          </div>
        </div>
        
        {children.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="h-6 w-px bg-slate-300"></div>
            <div className="flex space-x-8 pt-4 border-t border-slate-300 relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 h-4 w-px bg-slate-300"></div>
              {children.map(child => (
                <div key={child.id} className="relative px-2">
                   <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-px bg-slate-300"></div>
                   <TreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootNodes = hierarchy.filter(h => h.parentId === null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Hierarchy Management</h1>
           <p className="text-slate-500">Define authority levels and escalation flows</p>
        </div>
        <div className="w-72 flex space-x-2">
           <div className="flex-1">
             <label className="block text-sm font-medium text-slate-700 mb-1">Select Department</label>
             <Select value={selectedDeptId} onChange={handleDeptChange}>
                <option value="">-- Choose Department --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
             </Select>
           </div>
        </div>
      </div>

      <Card className="p-8 min-h-[500px] overflow-x-auto bg-slate-50/50 flex flex-col items-center justify-start">
         {!selectedDeptId && (
            <div className="text-center text-slate-400 mt-20">
               <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
               <p>Select a department to view or create its hierarchy.</p>
            </div>
         )}

         {selectedDeptId && rootNodes.length === 0 && (
            <div className="text-center mt-20">
               <p className="mb-4 text-slate-600">No hierarchy defined for this department yet.</p>
               <Button onClick={() => openAdd(null)}>Create Top Level Authority</Button>
            </div>
         )}

         {selectedDeptId && rootNodes.length > 0 && (
            <div className="w-full flex justify-center pb-12">
               {rootNodes.map(node => <TreeNode key={node.id} node={node} />)}
            </div>
         )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNode ? 'Edit Level' : 'Create Hierarchy Level'}
      >
        <form onSubmit={handleSave} className="space-y-4">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Level Name <span className="text-red-500">*</span>
              </label>
              <Input 
                value={nodeName} 
                onChange={e => setNodeName(e.target.value)} 
                placeholder="e.g., Ward Officer, Commissioner"
                required 
              />
           </div>
           {!editingNode && (
             <div className="text-xs text-slate-500">
               Creating child level under: {newNodeParentId ? hierarchy.find(h => h.id === newNodeParentId)?.name : 'Top Level'}
             </div>
           )}
           <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
};
