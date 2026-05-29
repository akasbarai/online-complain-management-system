import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from './ui';
import { Complaint, ComplaintStatus } from '../types';

type SlaCountdownProps = {
  complaint: Complaint;
  variant?: 'compact' | 'detail';
};

type CountdownState = {
  label: string;
  detail?: string;
  tone: 'complete' | 'breached' | 'pending' | 'safe' | 'warning' | 'urgent';
};

const terminalStatuses = [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED, ComplaintStatus.WITHDRAWN];

const formatDuration = (ms: number) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

const formatDueDate = (date: Date) =>
  date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

const getCountdownState = (complaint: Complaint, now: Date): CountdownState => {
  if (terminalStatuses.includes(complaint.status)) {
    return { label: 'SLA complete', tone: 'complete' };
  }

  if (complaint.slaBreached || complaint.status === ComplaintStatus.ESCALATED) {
    return { label: 'SLA breached', tone: 'breached' };
  }

  if (!complaint.slaDeadline) {
    return { label: 'SLA pending', detail: 'Starts after assignment', tone: 'pending' };
  }

  const deadline = new Date(complaint.slaDeadline);
  const diffMs = deadline.getTime() - now.getTime();

  if (Number.isNaN(deadline.getTime())) {
    return { label: 'SLA pending', detail: 'Deadline unavailable', tone: 'pending' };
  }

  if (diffMs <= 0) {
    return { label: 'SLA overdue', detail: `Due ${formatDueDate(deadline)}`, tone: 'breached' };
  }

  const hoursLeft = diffMs / 3600000;
  const tone = hoursLeft <= 4 ? 'urgent' : hoursLeft <= 24 ? 'warning' : 'safe';

  return {
    label: formatDuration(diffMs),
    detail: `Due ${formatDueDate(deadline)}`,
    tone
  };
};

const toneClasses: Record<CountdownState['tone'], string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  breached: 'border-red-200 bg-red-50 text-red-700',
  pending: 'border-slate-200 bg-slate-50 text-slate-600',
  safe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  urgent: 'border-red-200 bg-red-50 text-red-700'
};

const iconForTone = (tone: CountdownState['tone']) => {
  if (tone === 'complete') return CheckCircle2;
  if (tone === 'breached' || tone === 'urgent') return AlertTriangle;
  return Clock;
};

export const SlaCountdown: React.FC<SlaCountdownProps> = ({ complaint, variant = 'compact' }) => {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const state = getCountdownState(complaint, now);
  const Icon = iconForTone(state.tone);

  if (variant === 'detail') {
    return (
      <div className={cn('rounded-lg border p-4', toneClasses[state.tone])}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/70">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">SLA countdown</p>
            <p className="mt-1 text-lg font-bold">{state.label}</p>
            {state.detail && <p className="mt-1 text-xs font-medium opacity-80">{state.detail}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', toneClasses[state.tone])}>
      <Icon size={12} />
      {state.label}
    </span>
  );
};
