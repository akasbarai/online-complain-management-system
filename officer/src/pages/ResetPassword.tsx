
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { AuthService } from '../services/api';
import { Key, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'validating' | 'valid' | 'error' | 'success'>('validating');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid link. Token is missing.');
      return;
    }

    try {
      // Simulate validation
      const officer = AuthService.verifyResetToken(token);
      if (officer) {
        setTimeout(() => setStatus('valid'), 800); // Fake delay
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Link invalid or expired.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Passwords do not match!");
      return;
    }
    if (passwords.new.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (token) {
      try {
        await AuthService.confirmPasswordReset(token, passwords.new);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to update password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        
        {status === 'validating' && (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto text-primary-600 mb-4" size={32} />
            <h2 className="text-lg font-semibold">Verifying Secure Link...</h2>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Link Expired or Invalid</h2>
            <p className="text-slate-600 mb-6">{errorMsg}</p>
            <Button onClick={() => navigate('/login')} className="w-full">Return to Login</Button>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset Successful</h2>
            <p className="text-slate-600 mb-6">Your password has been updated. You can now login with your new credentials.</p>
            <Button onClick={() => navigate('/login')} className="w-full">Proceed to Login</Button>
          </div>
        )}

        {status === 'valid' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
               <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                 <Key size={24} />
               </div>
               <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
               <p className="text-slate-500 text-sm">Enter your new secure password below.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <Input 
                  type="password" 
                  required 
                  value={passwords.new}
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <Input 
                  type="password" 
                  required 
                  value={passwords.confirm}
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">Update Password</Button>
          </form>
        )}
      </Card>
    </div>
  );
};
