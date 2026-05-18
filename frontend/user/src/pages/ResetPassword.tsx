import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { AuthService } from '../services/api';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'validating' | 'idle' | 'success' | 'error'>('validating');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    AuthService.verifyResetToken(token)
      .then(() => setStatus('idle'))
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'Invalid or expired password reset link.');
      });
  }, [token]);

  const shellClass = 'flex min-h-screen items-center justify-center p-4';

  if (!token) {
    return (
      <div className={shellClass}>
        <Card className="w-full max-w-md border-t-4 border-t-red-600 p-8 text-center shadow-premium">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <AlertCircle size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-ink-950">Invalid Link</h2>
          <p className="mb-6 text-slate-600">No reset token was provided in the URL.</p>
          <Link to="/login">
            <Button className="w-full">Return to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }

    try {
      await AuthService.updatePasswordWithToken(token, password);
      setStatus('success');
      setMessage('Your password has been reset successfully.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to reset password.');
    }
  };

  if (status === 'success') {
    return (
      <div className={shellClass}>
        <Card className="w-full max-w-md border-t-4 border-t-civic-600 p-8 text-center shadow-premium">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-civic-100 text-civic-700">
            <CheckCircle size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-ink-950">Password Reset</h2>
          <p className="mb-6 text-slate-600">{message}</p>
          <Link to="/login">
            <Button className="w-full">Proceed to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (status === 'validating') {
    return (
      <div className={shellClass}>
        <Card className="w-full max-w-md border-t-4 border-t-primary-600 p-8 text-center shadow-premium">
          <h2 className="mb-2 text-2xl font-bold text-ink-950">Checking Link</h2>
          <p className="text-slate-600">Please wait while we verify this reset link.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <Card className="w-full max-w-md border-t-4 border-t-primary-600 p-8 shadow-premium">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-950 text-white">
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-bold text-ink-950">Set New Password</h1>
          <p className="text-slate-500">Enter your new password below</p>
        </div>

        {status === 'error' && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">New Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Confirm New Password</label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm password" />
          </div>

          <Button type="submit" className="w-full">Save New Password</Button>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-ink-900 hover:underline">
              Cancel and return to login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};
