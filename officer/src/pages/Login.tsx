import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { Button, Card, Input, Modal, PasswordInput } from '../components/ui';
import { AuthService } from '../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HELP_DESK_EMAIL = 'akas69167@gmail.com';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const validateLogin = () => {
    const trimmedEmail = email.trim();
    const nextErrors: { email?: string; password?: string } = {};

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
    setMessage('');

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    setForgotError('');
    setForgotMessage('');

    if (!trimmedEmail) {
      setForgotError('Email is required.');
      return;
    }

    if (!EMAIL_RE.test(trimmedEmail)) {
      setForgotError('Enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const data = await AuthService.forgotPassword(trimmedEmail);
      const successMessage = data.message || 'Password reset link sent to your email.';
      setForgotMessage(successMessage);
      setMessage(successMessage);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotModal = () => {
    setError('');
    setForgotError('');
    setForgotMessage('');
    setShowForgotModal(true);
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-slate-200 px-4 text-slate-950">
      <div className="absolute inset-x-0 top-[45%] h-24 bg-sky-700/20" />
      <div className="absolute bottom-0 right-0 h-44 w-44 rounded-tl-full bg-white/35" />

      <Card className="relative grid h-[500px] w-full max-w-5xl overflow-hidden rounded-xl border-white/60 shadow-2xl shadow-slate-900/20 md:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-slate-900 px-12 py-10 text-white md:flex md:flex-col md:justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),transparent_38%),radial-gradient(circle_at_46%_50%,rgba(14,165,233,0.24),transparent_26%)]" />
          <div className="absolute inset-x-0 top-0 h-1.5 bg-sky-600" />
          <div className="absolute left-0 top-0 h-24 w-24 rounded-br-full border-b border-r border-white/25" />
          <div className="absolute -left-8 top-5 h-36 w-36 rounded-full border border-white/20" />
          <div className="absolute -bottom-10 right-8 h-44 w-44 rounded-full border border-sky-300/35" />
          <div className="absolute bottom-8 right-0 h-24 w-24 rounded-tl-full border-l border-t border-white/25" />
          <div className="absolute right-7 top-8 grid grid-cols-3 gap-1.5">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} className="h-1 w-1 rounded-full bg-sky-200/80" />
            ))}
          </div>
          <span className="absolute left-36 top-10 text-2xl font-light text-sky-200/70">+</span>
          <span className="absolute bottom-20 left-12 h-3 w-3 rounded-full border border-white/80" />
          <span className="absolute right-28 top-20 h-3 w-3 rounded-full border border-sky-200/90" />

          <div className="relative max-w-sm">
            <div className="mb-9 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
              <ShieldCheck size={25} />
            </div>
            <h1 className="text-4xl font-bold leading-tight">Welcome back!</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/85">
              Sign in to manage assigned complaints, field updates, and citizen response work.
            </p>
          </div>
        </section>

        <section className="flex h-full items-center justify-center bg-white px-6 py-6 sm:px-10">
          <div className="w-full max-w-[330px]">
            <div className="mb-7 text-center md:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm md:hidden">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Sign In</h2>
              <p className="mt-1 text-xs text-slate-500">Officer portal access</p>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
              <div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="Username or email"
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'officer-email-error' : undefined}
                    className={`h-10 rounded-full border-slate-200 bg-slate-50 pl-9 text-xs focus:ring-sky-500 ${fieldErrors.email ? 'border-red-400 focus:ring-red-500' : ''}`}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="officer-email-error" className="mt-1.5 px-2 text-xs font-medium text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <PasswordInput
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'officer-password-error' : undefined}
                    className={`h-10 rounded-full border-slate-200 bg-slate-50 pl-9 text-xs focus:ring-sky-500 ${fieldErrors.password ? 'border-red-400 focus:ring-red-500' : ''}`}
                  />
                </div>
                {fieldErrors.password && (
                  <p id="officer-password-error" className="mt-1.5 px-2 text-xs font-medium text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="h-3 w-3 rounded border-slate-300 accent-sky-600" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="font-semibold text-slate-500 hover:text-sky-700"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="h-10 w-full rounded-full bg-sky-600 text-xs shadow-lg shadow-sky-700/20 hover:bg-sky-700" disabled={loading}>
                <Lock size={15} />
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-5 text-center text-[11px] text-slate-500">
              Help desk:{' '}
              <a href={`mailto:${HELP_DESK_EMAIL}`} className="font-semibold text-sky-700 hover:text-sky-900">
                {HELP_DESK_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </Card>

      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} title="Reset Password">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Enter your official email. We will send a secure reset link that expires in 24 hours.
          </p>

          {forgotError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {forgotError}
            </div>
          )}

          {forgotMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {forgotMessage}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Official Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="officer@example.com"
                autoComplete="email"
                className="h-11 pl-10"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Help desk:{' '}
            <a href={`mailto:${HELP_DESK_EMAIL}`} className="font-semibold text-primary-700 hover:text-primary-900">
              {HELP_DESK_EMAIL}
            </a>
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForgotModal(false)}>Cancel</Button>
            <Button type="submit" disabled={forgotLoading}>
              {forgotLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
