import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { AuthService } from '../services/api';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

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

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h2>
          <p className="text-slate-600 mb-6">No reset token was provided in the URL.</p>
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
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setMessage("Password must be at least 8 characters.");
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset</h2>
          <p className="text-slate-600 mb-6">{message}</p>
          <Link to="/login">
            <Button className="w-full">Proceed to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (status === 'validating') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Checking Link</h2>
          <p className="text-slate-600">Please wait while we verify this reset link.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
           <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
             <KeyRound size={24} />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
           <p className="text-slate-500">Enter your new password below</p>
        </div>

        {status === 'error' && (
          <div className="p-4 rounded-md text-sm mb-6 flex items-start gap-3 bg-red-50 text-red-700 border border-red-200">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
             <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
           </div>
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
             <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm password" />
           </div>
           
           <Button type="submit" className="w-full">Save New Password</Button>
           
           <div className="text-center mt-4">
             <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
               Cancel and return to login
             </Link>
           </div>
        </form>
      </Card>
    </div>
  );
};
