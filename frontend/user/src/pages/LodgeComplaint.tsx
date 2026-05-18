
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Select, Spinner } from '../components/ui';
import { ComplaintService, DeptService } from '../services/api';
import { UploadCloud, MapPin, AlertCircle, Navigation, Send, CheckCircle2 } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

export const LodgeComplaint = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    departmentId: '', 
    description: '',
    location: '',
    imageUrl: '',
  });

  useEffect(() => {
     DeptService.getAll()
       .then(depts => {
         setDepartments(depts);
         if (depts.length > 0) {
            setFormData(prev => ({ ...prev, departmentId: depts[0].id }));
         }
       })
       .catch(() => setDepartments([]))
       .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ComplaintService.lodge(formData);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData({ ...formData, location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your current location. Please ensure location services are enabled.");
          setIsGettingLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsGettingLocation(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       try {
          const compressedBase64 = await compressImage(file);
          setFormData({ ...formData, imageUrl: compressedBase64 });
       } catch (error) {
          console.error("Error compressing file:", error);
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

  return (
    <div className="space-y-6">
      <div className="premium-panel p-6">
        <h2 className="page-title">Lodge a New Complaint</h2>
        <p className="page-subtitle">Share the issue clearly so the right department can act faster.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-5 sm:p-6">
             <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                   <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wide text-ink-950">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-xs text-white">1</span>
                    Basic Details
                   </h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Subject <span className="text-red-500">*</span></label>
                       <Input required placeholder="e.g. Broken Street Light on 5th Ave" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                        <Select required value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                           <option value="" disabled>Select Department</option>
                           {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                           ))}
                        </Select>
                     </div>
                   </div>
                </div>

                <div>
                   <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wide text-ink-950">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-xs text-white">2</span>
                    Location & Description
                   </h3>
                   <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Exact Location <span className="text-red-500">*</span></label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <Input className="pl-9" required placeholder="Search or type address (e.g. 5th Avenue, NY)" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                          </div>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleGetCurrentLocation}
                            disabled={isGettingLocation}
                            className="flex whitespace-nowrap"
                          >
                            <Navigation size={16} className="mr-2" />
                            {isGettingLocation ? 'Locating...' : 'Current Location'}
                          </Button>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Description <span className="text-red-500">*</span></label>
                        <Textarea required rows={5} placeholder="Please describe the issue in detail. When did it start? How severe is it?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        <p className="text-xs text-slate-500 mt-1 text-right">Min 50 characters recommended</p>
                     </div>
                   </div>
                </div>

                <div>
                   <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wide text-ink-950">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-xs text-white">3</span>
                    Evidence
                   </h3>
                   <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-4 transition-colors hover:border-primary-500 hover:bg-white">
                      <input type="file" id="evidence-upload" className="hidden" accept="image/jpeg, image/png, application/pdf" onChange={handleFileChange} />
                      <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                         {formData.imageUrl ? (
                           <div className="relative w-full max-h-48 overflow-hidden rounded flex justify-center">
                              {formData.imageUrl.startsWith('data:application/pdf') ? (
                                 <div className="p-8 text-center text-red-500">
                                     <UploadCloud className="mx-auto mb-2 text-slate-400" size={48} />
                                     <p className="font-semibold">PDF Document Selected</p>
                                     <p className="text-xs text-slate-500 mt-2 hover:underline">Click to change file</p>
                                 </div>
                              ) : (
                                 <img src={formData.imageUrl} className="h-full max-h-48 object-contain rounded" alt="Evidence Preview" />
                              )}
                           </div>
                         ) : (
                           <div className="py-7 text-center">
                              <UploadCloud className="mx-auto mb-2 text-primary-500" size={34} />
                              <p className="text-sm font-bold text-ink-950">Click to upload photos or documents</p>
                              <p className="text-xs font-medium text-slate-500 mt-1">JPG, PNG, PDF (Max 5MB)</p>
                           </div>
                         )}
                      </label>
                   </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                   <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Cancel</Button>
                   <Button type="submit" className="gap-2 px-8"><Send size={16} /> Submit Complaint</Button>
                </div>
             </form>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="border-ink-950 bg-ink-950 p-5 text-white">
              <h4 className="mb-3 flex items-center font-bold text-white">
                <AlertCircle size={18} className="mr-2" /> Submission Tips
              </h4>
              <div className="space-y-3 text-sm text-slate-200">
                 {[
                   'Use a clear, specific subject title.',
                   'Add nearby landmarks or exact coordinates.',
                   'Attach photos when the issue is visible.',
                   'Choose the closest matching department.',
                 ].map(tip => (
                   <div key={tip} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-civic-500" size={16} />
                    <span>{tip}</span>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};
