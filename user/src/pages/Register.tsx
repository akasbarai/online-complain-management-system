
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { AuthService } from '../services/api';
import { UserPlus, CheckCircle, Clock, Camera, Upload, FileText } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^98\d{8}$/;

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Helper to compress image (imported from utils)

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const name = formData.name.trim();
    const email = formData.email.trim();
    const mobile = formData.mobile.trim();
    const address = formData.address.trim();

    if (!name) nextErrors.name = 'Full name is required.';
    if (!email) {
      nextErrors.email = 'Email address is required.';
    } else if (!EMAIL_RE.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!mobile) {
      nextErrors.mobile = 'Phone number is required.';
    } else if (!MOBILE_RE.test(mobile)) {
      nextErrors.mobile = 'Phone number must start with 98 or 97 and be exactly 10 digits.';
    }
    if (!formData.password.trim()) nextErrors.password = 'Password is required.';
    if (!address) nextErrors.address = 'Address is required.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

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
    setError('');
    if (!validateForm()) return;

    if (!formData.idCardUrl) {
      setError("Please upload an ID Card/Document for verification.");
      return;
    }
    try {
      await AuthService.register({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim()
      });
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
    if (confirm("This will clear local portal data from this browser. Continue?")) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('ocms_')) localStorage.removeItem(key);
      });
      window.location.reload();
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_55%,#ecfdf5_100%)] p-4">
        <Card className="w-full max-w-md p-8 text-center">
           <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700">
             <Clock size={32} />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Submitted</h2>
           <p className="text-slate-600 mb-6">
             Your account request is currently <strong>Pending Verification</strong> by an admin.
           </p>
           <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4 text-left">
              <Clock className="mt-0.5 shrink-0 text-amber-600" size={20} />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Our administrative team will review your ID documentation.</li>
                  <li>You can log in after an admin approves your account.</li>
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_55%,#ecfdf5_100%)] p-4">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
      <Card className="w-full max-w-2xl p-7 sm:p-8">
        <div className="text-center mb-8">
           <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary-50 text-primary-700">
              <UserPlus size={24} />
            </div>
           <h1 className="text-2xl font-bold text-slate-950">Citizen Registration</h1>
           <p className="mt-1 text-sm text-slate-500">Create an account to report issues.</p>
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
                 <div className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 transition-all ${formData.profilePicture ? 'border-primary-500' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                   {formData.profilePicture ? (
                     <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <Camera className="text-slate-400 group-hover:text-slate-600" size={32} />
                   )}
                </div>
                <div className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full shadow-md hover:bg-primary-700 transition-colors">
                   <Upload size={12} />
                </div>
              </label>
              <span className="text-xs text-slate-500 mt-2">Upload Profile Photo (Optional)</span>
           </div>

           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
               <Input
                 required
                 value={formData.name}
                 onChange={e => updateField('name', e.target.value)}
                 placeholder="Enter your full name"
                 aria-invalid={Boolean(fieldErrors.name)}
                 aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                 className={fieldErrors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined}
               />
               {fieldErrors.name && <p id="name-error" className="mt-1 text-xs font-medium text-red-600">{fieldErrors.name}</p>}
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
               <Input
                 required
                 type="email"
                 value={formData.email}
                 onChange={e => updateField('email', e.target.value)}
                 placeholder="enter your email address"
                 autoComplete="email"
                 aria-invalid={Boolean(fieldErrors.email)}
                 aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                 className={fieldErrors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined}
               />
               {fieldErrors.email && <p id="email-error" className="mt-1 text-xs font-medium text-red-600">{fieldErrors.email}</p>}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                 <Input
                   required
                   type="tel"
                   inputMode="numeric"
                   maxLength={10}
                   pattern="98[0-9]{8}"
                   value={formData.mobile}
                   onChange={e => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                   placeholder="98XXXXXXXX"
                   autoComplete="tel"
                   aria-invalid={Boolean(fieldErrors.mobile)}
                   aria-describedby={fieldErrors.mobile ? 'mobile-error' : undefined}
                   className={fieldErrors.mobile ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined}
                 />
                 {fieldErrors.mobile && <p id="mobile-error" className="mt-1 text-xs font-medium text-red-600">{fieldErrors.mobile}</p>}
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                 <Input
                   required
                   type="password"
                   value={formData.password}
                   onChange={e => updateField('password', e.target.value)}
                   placeholder="enter password"
                   autoComplete="new-password"
                   aria-invalid={Boolean(fieldErrors.password)}
                   aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                   className={fieldErrors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined}
                 />
                 {fieldErrors.password && <p id="password-error" className="mt-1 text-xs font-medium text-red-600">{fieldErrors.password}</p>}
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Residential Address <span className="text-red-500">*</span></label>
               <Input
                 required
                 value={formData.address}
                 onChange={e => updateField('address', e.target.value)}
                 placeholder="Enter your address"
                 autoComplete="street-address"
                 aria-invalid={Boolean(fieldErrors.address)}
                 aria-describedby={fieldErrors.address ? 'address-error' : undefined}
                 className={fieldErrors.address ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : undefined}
               />
               {fieldErrors.address && <p id="address-error" className="mt-1 text-xs font-medium text-red-600">{fieldErrors.address}</p>}
             </div>

             {/* ID Card Upload */}
             <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Government ID Proof <span className="text-red-500">*</span></label>
                <div className="border border-slate-300 border-dashed rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
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
           
            <div className="mt-4 text-center text-sm text-slate-500">
              Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign In</Link>
            </div>
         </form>
      </Card>
      </div>
    </div>
  );
};
