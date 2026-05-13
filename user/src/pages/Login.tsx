import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { AuthService } from '../services/api';
import { LogIn, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await AuthService.login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await AuthService.forgotPassword(email);
      setMessage('Password reset request sent. The admin will review it.');
      setIsForgotMode(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
           <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
             {isForgotMode ? <KeyRound size={24} /> : <LogIn size={24} />}
           </div>
           <h1 className="text-2xl font-bold text-slate-900">
             {isForgotMode ? 'Reset Password' : 'Citizen Login'}
           </h1>
           <p className="text-slate-500">
             {isForgotMode ? 'Request a password reset link' : 'Access the CivicResolve portal'}
           </p>
        </div>

        {error && (
          <div className={`p-4 rounded-md text-sm mb-6 flex items-start gap-3 ${error.includes('pending') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-4 rounded-md text-sm mb-6 flex items-start gap-3 bg-green-50 text-green-700 border border-green-200">
            <KeyRound size={18} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {isForgotMode ? (
          <form onSubmit={handleForgot} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
               <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john.doe@gmail.com" />
             </div>
             
             <Button type="submit" className="w-full" disabled={loading}>
               {loading ? 'Sending...' : 'Request Reset Link'}
             </Button>
             
             <div className="text-center mt-4 text-sm">
               <button type="button" onClick={() => setIsForgotMode(false)} className="text-slate-500 font-medium hover:text-slate-700 flex items-center justify-center mx-auto gap-1">
                 <ArrowLeft size={16} /> Back to Login
               </button>
             </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
               <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john.doe@gmail.com" />
             </div>
             <div>
               <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-slate-700">Password</label>
                 <button type="button" onClick={() => setIsForgotMode(true)} className="text-xs text-primary-600 hover:underline">Forgot password?</button>
               </div>
               <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
             </div>
             <Button type="submit" className="w-full" disabled={loading}>
               {loading ? 'Signing In...' : 'Sign In'}
             </Button>
             
             <div className="text-center mt-4 text-sm text-slate-500">
               Don't have an account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register Now</Link>
             </div>
             <div className="text-center text-xs text-slate-400 mt-2">
               Demo: Please register a new account to test User Portal capabilities.
             </div>
          </form>
        )}
      </Card>
    </div>
  );
};
