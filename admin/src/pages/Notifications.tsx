
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge, Textarea, Spinner } from '../components/ui';
import { NotificationService } from '../services/api';
import { Bell, Search } from 'lucide-react';

export const Notifications = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    NotificationService.getAll()
      .then(data => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'All' as 'All'|'Users'|'Officers',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await NotificationService.send(formData);
    const updated = await NotificationService.getAll();
    setHistory(updated);
    setFormData({ title: '', message: '', target: 'All' });
    alert('Notification sent successfully.');
  };

  const filteredHistory = history.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
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
      <h1 className="text-2xl font-bold text-slate-900">System Notifications</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Compose Message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Maintenance Alert" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                <Select value={formData.target} onChange={e => setFormData({...formData, target: e.target.value as any})}>
                  <option value="All">All Users & Officers</option>
                  <option value="Users">Citizens Only</option>
                  <option value="Officers">Officers Only</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  rows={4}
                  required
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full">
                <Bell size={16} className="mr-2" /> Broadcast Notification
              </Button>
            </form>
          </Card>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
           <Card className="p-0 overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
               <h3 className="font-semibold text-slate-700">Sent History</h3>
               <div className="flex gap-2">
                 <div className="relative w-48">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <Input 
                      className="pl-9 h-8 text-xs" 
                      placeholder="Search history..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
                 <Button 
                    variant="danger" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={async () => {
                       if (window.confirm('Are you sure you want to clear all notification history?')) {
                          await NotificationService.clearAll();
                          setHistory([]);
                       }
                    }}
                 >
                    Clear All
                 </Button>
               </div>
             </div>
             <table className="w-full text-left text-sm">
               <thead className="bg-white text-slate-500">
                 <tr>
                   <th className="px-6 py-3">Title</th>
                   <th className="px-6 py-3">Target</th>
                   <th className="px-6 py-3">Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredHistory.map(n => (
                   <tr key={n.id}>
                     <td className="px-6 py-4 font-medium">{n.title}</td>
                     <td className="px-6 py-4">{n.target}</td>
                     <td className="px-6 py-4 text-slate-500">{new Date(n.date).toLocaleDateString()}</td>
                   </tr>
                 ))}
                 {filteredHistory.length === 0 && (
                   <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-400">No notifications found.</td></tr>
                 )}
               </tbody>
             </table>
           </Card>
        </div>
      </div>
    </div>
  );
};
