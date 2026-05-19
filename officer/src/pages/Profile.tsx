import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Spinner } from '../components/ui';
import { AuthService } from '../services/api';
import { Shield, MapPin, Briefcase, Key, Camera } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

export const Profile = () => {
  const navigate = useNavigate();
  const [officer, setOfficer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    refreshOfficer();
  }, []);

  const refreshOfficer = async () => {
    try {
      const data = await AuthService.getStatus();
      setOfficer(data);
      localStorage.setItem('currentOfficer', JSON.stringify(data));
    } catch {
      AuthService.logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passData.new !== passData.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (passData.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    try {
      await AuthService.updatePassword(passData.current, passData.new);
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setPassData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Max 5MB allowed.");
        return;
      }
      try {
        const compressedDataUrl = await compressImage(file);
        try {
          await AuthService.updateProfile({ profilePhoto: compressedDataUrl });
          setOfficer(prev => ({ ...prev, profilePhoto: compressedDataUrl }));
          localStorage.setItem('currentOfficer', JSON.stringify({ ...AuthService.getCurrentOfficer(), profilePhoto: compressedDataUrl }));
        } catch {
          alert("Failed to save profile photo.");
        }
      } catch {
        alert("Failed to process image. Please try another.");
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

  if (!officer) return <div className="p-8 text-center">Profile not found.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Officer Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {officer.profilePhoto ? (
                <img src={officer.profilePhoto} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-inner border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-4xl font-bold text-slate-500 shadow-inner">
                  {officer.name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="text-white" size={24} />
              </div>
              <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*" 
                 onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{officer.name}</h2>
              <p className="text-slate-500">{officer.email}</p>
              <div className="flex gap-2 mt-3">
                <Badge variant={officer.status === 'Active' ? 'success' : 'danger'}>{officer.status}</Badge>
                <Badge variant="default">{officer.role}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-primary-700 font-semibold">
                <Briefcase size={18} />
                <h3>Assignment Details</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500">Department ID</span>
                  <span className="font-mono">{officer.departmentId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500">Designation</span>
                  <span>{officer.designation || officer.hierarchyLevelId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role</span>
                  <span>{officer.role}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-primary-700 font-semibold">
                <MapPin size={18} />
                <h3>Jurisdiction</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-500">Area/Zone</span>
                  <span>{officer.jurisdiction || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Office Location</span>
                  <span>OCMS Office, Block B</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold text-lg">
            <Shield size={20} className="text-primary-600" />
            <h3>Security</h3>
          </div>

          {message && (
            <div className={`p-3 rounded text-sm mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <Input
                type="password"
                value={passData.current}
                onChange={e => setPassData({...passData, current: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <Input 
                type="password" 
                value={passData.new} 
                onChange={e => setPassData({...passData, new: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <Input 
                type="password" 
                value={passData.confirm} 
                onChange={e => setPassData({...passData, confirm: e.target.value})} 
                required 
              />
            </div>
            <Button type="submit" className="w-full mt-2" variant="outline">
              <Key size={16} className="mr-2" /> Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
