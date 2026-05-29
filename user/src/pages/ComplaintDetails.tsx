import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CheckCircle2, Clock, FileText, MapPin, PackageCheck, RotateCcw, Send, User, XCircle } from 'lucide-react';
import { Badge, Button, Card, Spinner, Textarea } from '../components/ui';
import { ComplaintService } from '../services/api';
import { SlaCountdown } from '../components/SlaCountdown';
import { LocationMap } from '../components/LocationMap';
import { Complaint, ComplaintStatus } from '../types';

const statusTone = (status: ComplaintStatus): 'success' | 'secondary' | 'warning' | 'danger' | 'info' => {
  if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) return 'success';
  if (status === ComplaintStatus.REJECTED) return 'danger';
  if (status === ComplaintStatus.WITHDRAWN) return 'secondary';
  if (status === ComplaintStatus.SUBMITTED || status === ComplaintStatus.UNDER_REVIEW) return 'info';
  return 'warning';
};

const statusProgress = (status: ComplaintStatus) => {
  if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) return '100%';
  if (status === ComplaintStatus.WITHDRAWN || status === ComplaintStatus.REJECTED) return '100%';
  if (status === ComplaintStatus.IN_PROGRESS || status === ComplaintStatus.AWAITING_MATERIALS || status === ComplaintStatus.ESCALATED || status === ComplaintStatus.REOPENED) return '66%';
  if (status === ComplaintStatus.ASSIGNED || status === ComplaintStatus.UNDER_REVIEW) return '42%';
  return '18%';
};

const statusLabel = (status: ComplaintStatus) =>
  status === ComplaintStatus.AWAITING_MATERIALS ? 'Action Needed' : status;

const latestInformationRequest = (complaint: Complaint) =>
  [...(complaint.history || [])].reverse().find(event => {
    const action = (event.action || '').toLowerCase();
    return action.includes('more information') || action.includes('awaiting materials');
  });

export const ComplaintDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawMode, setIsWithdrawMode] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopenMode, setIsReopenMode] = useState(false);
  const [materialsResponse, setMaterialsResponse] = useState('');
  const [isSendingMaterials, setIsSendingMaterials] = useState(false);

  useEffect(() => {
    if (id) {
      ComplaintService.getById(id)
        .then(data => setComplaint(data))
        .catch(() => navigate('/dashboard'))
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const refresh = async () => {
    if (id) {
      try {
        const data = await ComplaintService.getById(id);
        setComplaint(data);
      } catch {
        // Keep current view; route guard will handle later navigation.
      }
    }
  };

  const handleWithdraw = async () => {
    if (complaint && withdrawReason.trim()) {
      try {
        await ComplaintService.withdraw(complaint.id, withdrawReason.trim());
        await refresh();
        setIsWithdrawMode(false);
        setWithdrawReason('');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleAcceptResolution = async () => {
    if (!complaint) return;
    try {
      await ComplaintService.acceptResolution(complaint.id);
      await refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProvideMaterials = async () => {
    if (!complaint || !materialsResponse.trim()) return;

    try {
      setIsSendingMaterials(true);
      await ComplaintService.provideMaterials(complaint.id, materialsResponse.trim());
      await refresh();
      setMaterialsResponse('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSendingMaterials(false);
    }
  };

  const handleReopen = async () => {
    if (complaint && reopenReason.trim()) {
      try {
        await ComplaintService.reopen(complaint.id, reopenReason.trim());
        await refresh();
        setIsReopenMode(false);
        setReopenReason('');
      } catch (err: any) {
        alert(err.message);
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

  if (!complaint) return <div className="p-8 text-center">Complaint not found.</div>;

  const canWithdraw = ![ComplaintStatus.CLOSED, ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED, ComplaintStatus.WITHDRAWN].includes(complaint.status);
  const canReviewResolution = complaint.status === ComplaintStatus.RESOLVED;
  const canProvideMaterials = complaint.status === ComplaintStatus.AWAITING_MATERIALS;
  const informationRequest = latestInformationRequest(complaint);

  return (
    <div className="page-shell">
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 pl-0 text-slate-500 hover:text-slate-950">
        <ArrowLeft size={16} /> Back to Dashboard
      </Button>

      <div className="overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm shadow-primary-100/70">
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{complaint.title}</h1>
            <Badge variant={statusTone(complaint.status)}>{statusLabel(complaint.status)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">#{complaint.id}</span>
            <span className="flex items-center gap-1"><CalendarClock size={14} /> {new Date(complaint.createdAt).toLocaleDateString()}</span>
          </div>
          </div>
          {canWithdraw && (
            <Button variant={isWithdrawMode ? 'outline' : 'danger'} size="sm" onClick={() => setIsWithdrawMode(!isWithdrawMode)} className="gap-2">
              <XCircle size={16} /> {isWithdrawMode ? 'Cancel Withdrawal' : 'Withdraw'}
            </Button>
          )}
          {canReviewResolution && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="sm" onClick={handleAcceptResolution} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 size={16} /> Accept Resolution
              </Button>
              <Button variant={isReopenMode ? 'outline' : 'secondary'} size="sm" onClick={() => setIsReopenMode(!isReopenMode)} className="gap-2">
                <RotateCcw size={16} /> {isReopenMode ? 'Cancel Reopen' : 'Reopen'}
              </Button>
            </div>
          )}
        </div>
        <div className="border-t border-primary-100 bg-primary-50/60 px-6 py-4">
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: statusProgress(complaint.status) }} />
          </div>
          <div className="mt-3 grid grid-cols-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Submitted</span>
            <span className="text-center">Assigned</span>
            <span className="text-right">Resolved</span>
          </div>
        </div>
      </div>

      {isWithdrawMode && (
        <Card className="border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-800">Withdraw Complaint</h3>
          <p className="mt-1 text-sm text-red-700">Provide a reason before closing this request.</p>
          <Textarea
            placeholder="Reason for withdrawal"
            className="mb-4 mt-4 bg-white"
            value={withdrawReason}
            onChange={e => setWithdrawReason(e.target.value)}
          />
          <Button variant="danger" onClick={handleWithdraw} disabled={!withdrawReason.trim()}>Confirm Withdrawal</Button>
        </Card>
      )}

      {isReopenMode && (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">Reopen Complaint</h3>
          <p className="mt-1 text-sm text-amber-800">Explain why the resolution did not solve your issue.</p>
          <Textarea
            placeholder="Reason for reopening"
            className="mb-4 mt-4 bg-white"
            value={reopenReason}
            onChange={e => setReopenReason(e.target.value)}
          />
          <Button onClick={handleReopen} disabled={!reopenReason.trim()}>Confirm Reopen</Button>
        </Card>
      )}

      {canProvideMaterials && (
        <Card className="border-amber-200 bg-amber-50 p-5 shadow-sm shadow-amber-100/80">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-700">
              <PackageCheck size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-amber-950">Officer Needs Your Response</h3>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Your complaint is paused until you send the information below. The officer and admin will be notified after you reply.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-amber-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">What is needed</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {informationRequest?.details || 'Please provide the extra information requested by the officer so work can continue.'}
            </p>
          </div>
          <label className="mt-4 block text-sm font-semibold text-amber-950" htmlFor="citizen-response">
            Your response
          </label>
          <Textarea
            id="citizen-response"
            rows={4}
            placeholder="Write the details the officer asked for. Example: exact address, document number, photo details, contact time, or other missing information."
            className="mt-2 bg-white"
            value={materialsResponse}
            onChange={e => setMaterialsResponse(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={handleProvideMaterials} disabled={!materialsResponse.trim() || isSendingMaterials} className="gap-2">
              <Send size={16} /> {isSendingMaterials ? 'Sending...' : 'Send Response'}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SlaCountdown complaint={complaint} variant="detail" />

          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <FileText size={14} /> Description
                </h4>
                <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {complaint.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <MapPin size={14} /> Location
                  </h4>
                  <p className="text-sm font-medium text-slate-900">{complaint.location || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <Clock size={14} /> Last Updated
                  </h4>
                  <p className="text-sm font-medium text-slate-900">{new Date(complaint.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <LocationMap
                location={complaint.location}
                latitude={complaint.latitude}
                longitude={complaint.longitude}
              />

              {complaint.imageUrl && (
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <FileText size={14} /> Attached Evidence
                  </h4>
                  {complaint.imageUrl.startsWith('data:application/pdf') ? (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center text-slate-700">
                        <FileText className="mr-3 text-red-500" size={24} />
                        <span className="text-sm font-medium">PDF Document</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const win = window.open();
                          if (win) {
                            win.document.write('<iframe src="' + complaint.imageUrl + '" frameborder="0" style="border:0;top:0;left:0;bottom:0;right:0;width:100%;height:100%;" allowfullscreen></iframe>');
                          }
                        }}
                      >
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <img
                        src={complaint.imageUrl}
                        alt="Evidence"
                        className="max-h-72 w-full cursor-pointer bg-slate-100 object-contain transition-opacity hover:opacity-90"
                        onClick={() => {
                          const win = window.open();
                          if (win) {
                            win.document.write('<img src="' + complaint.imageUrl + '" style="max-width:100%;height:auto;" />');
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="mb-6 flex items-center gap-2 font-semibold text-slate-950">
            <Clock size={18} className="text-slate-400" /> Timeline
          </h3>

          <div className="relative space-y-7 before:absolute before:bottom-0 before:left-3.5 before:top-2 before:w-px before:bg-slate-200">
            {complaint.history.map((event, index) => (
              <div key={index} className="relative pl-10">
                <div className="absolute left-0 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary-500 bg-white">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-500"></div>
                </div>
                <p className="text-sm font-semibold text-slate-950">{event.action}</p>
                {event.details && <p className="mt-1 text-sm leading-6 text-slate-600">{event.details}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="h-5 py-0 text-[10px]">
                    <User size={10} className="mr-1" /> {event.actor}
                  </Badge>
                  <span className="text-xs text-slate-400">{new Date(event.date).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
