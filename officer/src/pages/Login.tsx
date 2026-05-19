import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Radio,
  Shield,
  type LucideIcon
} from 'lucide-react';
import { Input, Button, Modal } from '../components/ui';
import { AuthService } from '../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signalCards: Array<{ label: string; value: string; icon: LucideIcon; tone: string }> = [
  { label: 'Priority queue', value: 'Live', icon: Radio, tone: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200' },
  { label: 'Verified access', value: 'Secure', icon: BadgeCheck, tone: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' },
  { label: 'Field updates', value: 'Synced', icon: Bell, tone: 'border-amber-300/25 bg-amber-300/10 text-amber-200' }
];

const caseRows: Array<{ title: string; detail: string; status: string; icon: LucideIcon; tone: string }> = [
  {
    title: 'Road repair request',
    detail: 'Ward 5 queue',
    status: 'Assigned',
    icon: ClipboardCheck,
    tone: 'bg-cyan-100 text-cyan-700'
  },
  {
    title: 'Water supply complaint',
    detail: 'Follow-up due',
    status: 'Review',
    icon: AlertTriangle,
    tone: 'bg-amber-100 text-amber-700'
  },
  {
    title: 'Resolved notification',
    detail: 'Citizen update sent',
    status: 'Closed',
    icon: CheckCircle2,
    tone: 'bg-emerald-100 text-emerald-700'
  }
];

const workflowItems = [
  { label: 'Review assigned complaints', icon: ClipboardCheck },
  { label: 'Update field progress', icon: MapPin },
  { label: 'Track admin alerts', icon: Bell }
];

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const validateLogin = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateLogin()) return;

    setLoading(true);
    try {
      await AuthService.login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-900">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.98),rgba(20,83,45,0.74)),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:auto,84px_84px,84px_84px]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-primary-500 to-amber-300" />
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
        <svg className="absolute left-0 top-0 h-full w-full" viewBox="0 0 1440 920" preserveAspectRatio="none">
          <path
            d="M-80 710 C 170 610 255 760 445 630 S 735 410 940 500 1190 670 1520 500"
            fill="none"
            stroke="rgba(103,232,249,0.18)"
            strokeWidth="3"
          />
          <path
            d="M70 180 C 250 250 320 150 495 230 S 780 420 980 310 1260 160 1490 270"
            fill="none"
            stroke="rgba(74,222,128,0.16)"
            strokeWidth="2"
            strokeDasharray="12 18"
          />
          <path
            d="M290 980 C 360 760 495 710 650 725 S 885 800 995 625 1190 345 1530 390"
            fill="none"
            stroke="rgba(251,191,36,0.13)"
            strokeWidth="2"
          />
          <g fill="rgba(255,255,255,0.72)" stroke="rgba(34,197,94,0.8)" strokeWidth="3">
            <circle cx="216" cy="655" r="7" />
            <circle cx="522" cy="592" r="7" />
            <circle cx="910" cy="497" r="7" />
            <circle cx="1160" cy="612" r="7" />
          </g>
          <g stroke="rgba(255,255,255,0.12)" strokeWidth="1">
            <path d="M112 0 V920" />
            <path d="M348 0 V920" />
            <path d="M1115 0 V920" />
            <path d="M0 142 H1440" />
            <path d="M0 418 H1440" />
            <path d="M0 764 H1440" />
          </g>
        </svg>
        <div className="absolute left-8 top-24 hidden h-44 w-44 rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-cyan-950/40 backdrop-blur-sm md:block" />
        <div className="absolute bottom-14 right-10 hidden h-56 w-72 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.05] shadow-2xl shadow-emerald-950/30 backdrop-blur-sm lg:block" />
        <div className="absolute right-[42%] top-10 hidden h-28 w-52 rotate-6 rounded-lg border border-amber-200/10 bg-amber-200/[0.06] backdrop-blur-sm xl:block" />
      </div>

      <main className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="hidden min-h-[680px] flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-slate-900/70 p-8 text-white shadow-2xl shadow-slate-950/40 backdrop-blur lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-500 text-white shadow-lg shadow-primary-950/30">
                  <Shield size={26} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">CivicResolve</p>
                  <p className="text-xs text-slate-300">Officer access console</p>
                </div>
              </div>
              <div className="rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                Active system
              </div>
            </div>

            <div className="mt-14 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Municipal operations</p>
              <h1 className="mt-4 max-w-xl text-5xl font-bold leading-tight tracking-normal text-white">
                A focused desk for every assigned case.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Monitor assignments, coordinate field progress, and keep citizen complaints moving through resolution.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="grid grid-cols-3 gap-3">
              {signalCards.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className={`rounded-md border p-4 ${tone}`}>
                  <Icon size={20} />
                  <p className="mt-4 text-xs text-slate-300">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
              <div className="rounded-lg border border-white/10 bg-white/[0.97] p-5 text-slate-900 shadow-xl shadow-slate-950/20">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-950">Assignment snapshot</p>
                    <p className="text-xs text-slate-500">Current officer queue</p>
                  </div>
                  <CalendarClock size={20} className="text-primary-600" />
                </div>
                <div className="mt-4 space-y-3">
                  {caseRows.map(({ title, detail, status, icon: Icon, tone }) => (
                    <div key={title} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}>
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                        <p className="truncate text-xs text-slate-500">{detail}</p>
                      </div>
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-primary-300">
                  <Building2 size={21} />
                </div>
                <p className="mt-5 text-sm font-semibold text-white">Daily flow</p>
                <div className="mt-4 space-y-3">
                  {workflowItems.map(({ label, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-slate-200">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-primary-200">
                        <Icon size={16} />
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center py-4 lg:min-h-[680px]">
          <div className="w-full max-w-md">
            <div className="mb-7 text-white lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-500 text-white shadow-lg shadow-primary-950/30">
                <Shield size={26} />
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-normal">Officer Portal</h1>
              <p className="mt-2 text-sm text-slate-300">Secure access for authorized personnel.</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/30">
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-6 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="hidden h-12 w-12 items-center justify-center rounded-md bg-primary-600 text-white shadow-lg shadow-primary-600/20 sm:flex">
                    <Shield size={26} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-normal text-slate-950">Welcome back</h2>
                    <p className="mt-1 text-sm text-slate-500">Sign in to continue your officer workspace.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5 px-6 py-6 sm:px-8" noValidate>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <span className="font-semibold">Error:</span> {error}
                  </div>
                )}

                <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900">
                  Officers created in the Admin Panel are synced here. Use the password generated during creation.
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Official Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      required
                      placeholder="enter your gmail"
                      autoComplete="email"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'officer-email-error' : undefined}
                      className={`h-11 pl-10 ${fieldErrors.email ? 'border-red-400 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="officer-email-error" className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <Input
                      type="password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      required
                      placeholder="......."
                      autoComplete="current-password"
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'officer-password-error' : undefined}
                      className={`h-11 pl-10 ${fieldErrors.password ? 'border-red-400 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p id="officer-password-error" className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.password}</p>
                  )}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-900"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                <Button type="submit" className="h-11 w-full gap-2" size="lg" disabled={loading}>
                  <Lock size={18} />
                  {loading ? 'Signing In...' : 'Secure Login'}
                </Button>
              </form>
            </div>

            <p className="mt-5 text-center text-xs text-slate-300">
              Access is monitored and limited to active officer accounts.
            </p>
          </div>
        </section>
      </main>

      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} title="Reset Password">
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
              <Lock size={24} />
            </div>
          </div>
          <p className="text-slate-600 text-sm text-center">
            To ensure security, password resets must be initiated by the Administrator.
          </p>
          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm">
            <ol className="list-decimal pl-4 space-y-2 text-slate-700">
              <li>Contact the <strong>Admin Department</strong>.</li>
              <li>Request a password reset for your account.</li>
              <li>You will receive a <strong>Reset Link</strong> via email.</li>
              <li>Click the link to set a new password.</li>
            </ol>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowForgotModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
