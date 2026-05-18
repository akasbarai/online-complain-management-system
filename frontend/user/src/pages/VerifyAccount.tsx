
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, Button } from '../components/ui';
import { AuthService } from '../services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const VerifyAccount = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your account...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    try {
      // Simulate network delay for better UX
      setTimeout(() => {
        try {
          AuthService.verifyToken(token);
          setStatus('success');
          setMessage('Your account has been successfully verified! You can now log in.');
        } catch (err: any) {
          setStatus('error');
          setMessage(err.message || 'Verification failed. The link may be invalid or expired.');
        }
      }, 1500);
    } catch (e) {
      setStatus('error');
      setMessage('An unexpected error occurred.');
    }
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-t-4 border-t-primary-600 p-8 text-center shadow-premium">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-primary-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-ink-950">Verifying Account</h2>
            <p className="text-slate-500 mt-2">Please wait while we confirm your details...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
              <CheckCircle size={32} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-ink-950">Verification Successful</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link to="/login" className="w-full">
              <Button className="w-full">Proceed to Login</Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
              <XCircle size={32} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-ink-950">Verification Failed</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">Return to Login</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};
