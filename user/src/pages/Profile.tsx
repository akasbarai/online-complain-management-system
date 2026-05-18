import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Spinner } from '../components/ui';
import { AuthService } from '../services/api';
import { User } from '../types';
import { UserCheck, MapPin, Mail, Phone, Shield, FileText, Camera, Upload } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

export const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [profilePicturePreview, setProfilePicturePreview] = useState('');

  useEffect(() => {
    refreshProfile();
  }, []);

  const refreshProfile = async () => {
    try {
      const data = await AuthService.getStatus();
      setUser(data);
      setFormData(data);
      setProfilePicturePreview(data.profilePicture || '');
      localStorage.setItem('currentUser', JSON.stringify(data));
    } catch {
      AuthService.logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Max 5MB allowed.");
        return;
      }
      try {
        const compressedBase64 = await compressImage(file);
        setProfilePicturePreview(compressedBase64);
        setFormData(prev => ({ ...prev, profilePicture: compressedBase64 }));
      } catch {
        alert("Failed to process image. Please try another.");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AuthService.updateProfile(formData);
      setIsEditing(false);
      refreshProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!user) return <div>Please login.</div>;

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage contact information and verification details.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col items-center p-6 text-center">
           <div className="relative mb-4">
             {profilePicturePreview || user.profilePicture ? (
               <img 
                 src={profilePicturePreview || user.profilePicture} 
                 alt={user.name} 
                className="h-24 w-24 rounded-full border-2 border-primary-100 object-cover shadow-sm"
               />
             ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-3xl font-bold text-primary-600">
                 {user.name.charAt(0)}
               </div>
             )}
             <label className="absolute bottom-0 right-0 cursor-pointer group">
               <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
               <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center shadow-md hover:bg-primary-700 transition-colors">
                 <Camera size={12} className="text-white" />
               </div>
             </label>
           </div>
           
            <h2 className="text-xl font-bold text-slate-950">{user.name}</h2>
           <p className="mb-4 text-sm text-slate-500">Citizen account</p>
           
            <div className="w-full space-y-3 border-t border-slate-100 pt-4 text-left">
              <div className="flex items-center text-sm text-slate-600">
                 <Mail size={16} className="mr-3 text-slate-400" /> {user.email}
              </div>
              <div className="flex items-center text-sm text-slate-600">
                 <Phone size={16} className="mr-3 text-slate-400" /> {user.mobile || 'Not set'}
              </div>
              <div className="flex items-center text-sm text-slate-600">
                 <MapPin size={16} className="mr-3 text-slate-400" /> {user.address || 'Not set'}
              </div>
           </div>
        </Card>

        <div className="md:col-span-2">
            <Card className="p-6">
               <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-950">Personal Information</h3>
                 {!isEditing && (
                   <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                 )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                         <Input value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Email (Read Only)</label>
                         <Input disabled value={formData.email || ''} className="bg-slate-50 text-slate-500" />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Residential Address</label>
                      <Input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                   </div>
                   <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit">Save Changes</Button>
                   </div>
                </form>
              ) : (
                 <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 pb-3 sm:grid-cols-3 sm:gap-4">
                      <span className="text-slate-500">Registered On</span>
                      <span className="col-span-2 font-medium">{new Date(user.registeredDate).toLocaleDateString()}</span>
                   </div>
                    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 pb-3 sm:grid-cols-3 sm:gap-4">
                      <span className="text-slate-500">Address</span>
                      <span className="col-span-2 font-medium">{user.address || '-'}</span>
                   </div>
                    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 pb-3 sm:grid-cols-3 sm:gap-4">
                      <span className="text-slate-500">Mobile</span>
                      <span className="col-span-2 font-medium">{user.mobile || '-'}</span>
                   </div>
                    <div className="grid grid-cols-1 gap-1 pb-3 sm:grid-cols-3 sm:gap-4">
                      <span className="text-slate-500">ID Verification</span>
                      <span className="col-span-2 font-medium flex items-center text-green-700">
                         {user.idCardUrl ? (
                           <>
                             <FileText size={16} className="mr-2" /> Document Uploaded
                           </>
                         ) : 'Pending'}
                      </span>
                   </div>
                </div>
              )}
           </Card>

           <Card className="p-6 mt-6">
               <h3 className="mb-4 flex items-center text-lg font-bold text-slate-950">
                 <Shield size={18} className="mr-2 text-slate-400" /> Security
              </h3>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-200">
                 <div>
                    <p className="font-medium text-sm text-slate-900">Password</p>
                    <p className="text-xs text-slate-500">Last changed upon registration</p>
                 </div>
                 <Button variant="outline" size="sm" disabled>Change Password</Button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};
