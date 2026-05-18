
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { AuthService } from '../services/api';
import { UserPlus, CheckCircle, Clock, Camera, Upload, FileText } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    password: '',
    profilePicture: '',
    idCardUrl: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Helper to compress image (imported from utils)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'profilePicture' | 'idCardUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit check before compression
        setError("File size too large. Max 5MB allowed.");
        return;
      }

      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, [field]: compressedBase64 }));
        setError('');
      } catch (err) {
        setError("Failed to process image. Please try another.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idCardUrl) {
      setError("Please upload an ID Card/Document for verification.");
      return;
    }
    try {
      await AuthService.register(formData);
      setSuccess(true);
    } catch (err: any) {
      setSuccess(false);
      const isQuotaError = err.message.toLowerCase().includes('quota') || 
                           err.message.toLowerCase().includes('storage limits') ||
                           err.name === 'QuotaExceededError';
      
      if (isQuotaError) {
        setError("Registration failed because browser storage is full. Please try again after clicking the 'Reset Storage' button below.");
      } else {
        setError(err.message);
      }
    }
  };

  const handleResetStorage = () => {
    if (confirm("This will clear all temporary data (complaints, users, etc.) in this demo environment. Continue?")) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('civic_')) localStorage.removeItem(key);
      });
      window.location.reload();
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-t-4 border-t-civic-600 p-8 text-center shadow-premium">
           <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-ink-950 text-white">
             <Clock size={32} />
           </div>
           <h2 className="mb-2 text-2xl font-bold text-ink-950">Registration Submitted</h2>
           <p className="text-slate-600 mb-6">
             Your account request is currently <strong>Pending Verification</strong> by an admin.
           </p>
           <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
              <Clock className="text-yellow-600 shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Our administrative team will review your ID documentation.</li>
                  <li>You will receive an email once your account is approved.</li>
                </ul>
              </div>
           </div>
           <Link to="/login">
             <Button className="w-full">Return to Login</Button>
           </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg border-t-4 border-t-primary-600 p-8 shadow-premium">
        <div className="text-center mb-8">
           <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-950 text-white shadow-md shadow-ink-950/20">
             <UserPlus size={24} />
           </div>
           <h1 className="text-2xl font-bold text-ink-950">Citizen Registration</h1>
           <p className="text-slate-500">Create an account to report issues</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 text-center border border-red-100 flex flex-col items-center gap-2">
            <span>{error}</span>
            {error.includes('storage is full') && (
              <Button variant="outline" size="sm" onClick={handleResetStorage} className="text-red-600 border-red-200">
                Reset Storage & Reload
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
           {/* Profile Picture Upload */}
           <div className="flex flex-col items-center mb-6">
              <label className="relative cursor-pointer group">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profilePicture')} />
                <div className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 transition-all ${formData.profilePicture ? 'border-primary-600 shadow-md' : 'border-slate-300 border-dashed bg-slate-50'}`}>
                   {formData.profilePicture ? (
                     <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <Camera className="text-slate-400 group-hover:text-slate-600" size={32} />
                   )}
                </div>
                <div className="absolute bottom-0 right-0 rounded-full bg-primary-600 p-1.5 text-white shadow-md transition-colors hover:bg-primary-700">
                   <Upload size={12} />
                </div>
              </label>
              <span className="text-xs text-slate-500 mt-2">Upload Profile Photo (Optional)</span>
           </div>

           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
               <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
               <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                 <Input required type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="+1 234 567 8900" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                 <Input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Residential Address <span className="text-red-500">*</span></label>
               <Input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Street, City" />
             </div>

             {/* ID Card Upload */}
             <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Government ID Proof <span className="text-red-500">*</span></label>
                <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-4 transition-colors hover:border-primary-500 hover:bg-white">
                   <input type="file" id="id-upload" className="hidden" accept="image/*, application/pdf" onChange={(e) => handleFileChange(e, 'idCardUrl')} />
                   <label htmlFor="id-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                      {formData.idCardUrl ? (
                        <div className="relative w-full h-32 flex justify-center">
                           {formData.idCardUrl.startsWith('data:application/pdf') ? (
                              <div className="p-4 text-center text-red-500">
                                  <FileText className="mx-auto mb-2 text-slate-400" size={32} />
                                  <p className="font-semibold text-sm">PDF Document Selected</p>
                              </div>
                           ) : (
                               <img src={formData.idCardUrl} className="w-full h-full object-contain rounded" alt="ID Preview" />
                           )}
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded">
                              <span className="text-white font-medium text-sm flex items-center"><Upload size={14} className="mr-1"/> Change ID</span>
                           </div>
                        </div>
                      ) : (
                        <>
                          <FileText size={24} className="text-slate-400" />
                          <div className="text-center">
                             <span className="text-primary-600 font-medium hover:underline">Click to upload</span>
                             <span className="text-slate-500"> or drag and drop</span>
                          </div>
                          <p className="text-xs text-slate-400">JPG, PNG or PDF (Documents allowed)</p>
                        </>
                      )}
                   </label>
                </div>
             </div>
           </div>
           
           <Button type="submit" className="w-full mt-4">Submit Registration</Button>
           
           <div className="text-center mt-4 text-sm text-slate-500">
             Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign In</Link>
           </div>
        </form>
      </Card>
    </div>
  );
};
