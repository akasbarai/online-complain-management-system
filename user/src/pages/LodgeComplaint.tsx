import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, FileText, Send, UploadCloud } from 'lucide-react';
import { Button, Card, Input, Select, Spinner, Textarea } from '../components/ui';
import { ComplaintService, DeptService } from '../services/api';
import { LocationPicker } from '../components/LocationPicker';
import { compressImage } from '../utils/compressImage';

const StepLabel = ({ number, title }: { number: number; title: string }) => (
  <div className="mb-4 flex items-center gap-3">
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-50 text-sm font-bold text-primary-700 ring-1 ring-primary-100">
      {number}
    </span>
    <h3 className="section-heading">{title}</h3>
  </div>
);

type ComplaintFormData = {
  title: string;
  departmentId: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string;
};

export const LodgeComplaint = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ComplaintFormData>({
    title: '',
    departmentId: '',
    description: '',
    location: '',
    latitude: null,
    longitude: null,
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
    setError('');
    setSubmitting(true);
    try {
      await ComplaintService.lodge(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedBase64 = await compressImage(file);
        setFormData({ ...formData, imageUrl: compressedBase64 });
        setError('');
      } catch {
        setError('Could not process the selected file.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm shadow-primary-100/70">
        <div className="p-6">
          <p className="page-kicker">New report</p>
          <h2 className="mt-2 page-title">Lodge a Complaint</h2>
          <p className="page-subtitle max-w-2xl">Submit the issue, location, and optional evidence for department review.</p>
        </div>
        <div className="grid border-t border-primary-100 bg-primary-50/60 px-6 py-4 text-sm text-slate-600 sm:grid-cols-3">
          <span className="py-1">1. Basic details</span>
          <span className="py-1">2. Location and description</span>
          <span className="py-1">3. Evidence and submit</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                <StepLabel number={1} title="Basic details" />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                    <Input required placeholder="Broken street light near Ward 5" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                    <Select required value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                      <option value="" disabled>Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <StepLabel number={2} title="Location and description" />
                <div className="space-y-4">
                  <LocationPicker
                    location={formData.location}
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChange={value => setFormData(prev => ({ ...prev, ...value }))}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Detailed Description</label>
                    <Textarea required rows={6} placeholder="Describe the issue, impact, and any useful timing details." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                <StepLabel number={3} title="Evidence" />
                <div className="rounded-lg border border-dashed border-primary-200 bg-white p-4 transition-colors hover:bg-primary-50/40">
                  <input type="file" id="evidence-upload" className="hidden" accept="image/jpeg, image/png, application/pdf" onChange={handleFileChange} />
                  <label htmlFor="evidence-upload" className="flex cursor-pointer flex-col items-center justify-center gap-2">
                    {formData.imageUrl ? (
                      <div className="flex w-full flex-col items-center gap-3">
                        {formData.imageUrl.startsWith('data:application/pdf') ? (
                          <div className="rounded-md border border-slate-200 bg-white p-6 text-center">
                            <FileText className="mx-auto mb-2 text-red-500" size={40} />
                            <p className="text-sm font-semibold text-slate-800">PDF selected</p>
                          </div>
                        ) : (
                          <img src={formData.imageUrl} className="max-h-56 rounded-md border border-slate-200 bg-white object-contain" alt="Evidence preview" />
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                          <Check size={14} /> Click to replace
                        </span>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <UploadCloud className="mx-auto mb-2 text-slate-400" size={34} />
                        <p className="text-sm font-medium text-slate-700">Upload photos or documents</p>
                        <p className="mt-1 text-xs text-slate-400">JPG, PNG, or PDF</p>
                      </div>
                    )}
                  </label>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  <Send size={16} /> {submitting ? 'Submitting' : 'Submit Complaint'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h4 className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
              <AlertCircle size={18} className="text-primary-600" /> Checklist
            </h4>
            <div className="space-y-3 text-sm text-slate-600">
              {[
                ['Subject', formData.title],
                ['Department', formData.departmentId],
                ['Location', formData.location],
                ['Description', formData.description],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                  <span>{label}</span>
                  <span className={value ? 'text-emerald-600' : 'text-slate-400'}>
                    {value ? <Check size={16} /> : '-'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-civic-100 bg-civic-50 p-3 text-xs leading-5 text-civic-700">
              Accurate location and clear evidence help officers route the issue faster.
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};
