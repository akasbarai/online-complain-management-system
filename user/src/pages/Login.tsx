import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { AuthService } from '../services/api';
import { Button, Card, Input } from '../components/ui';

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
      navigate('/dashboard');
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
    <div className="min-h-screen bg-slate-950 text-slate-950">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(2, 6, 23, 0.94), rgba(15, 23, 42, 0.7)), url('https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1800&q=80')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div className="hidden text-white lg:block">
            <Link to="/" className="mb-10 inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 font-bold shadow-sm">C</span>
              <span className="text-xl font-bold">CivicResolve</span>
            </Link>
            <h1 className="max-w-lg text-4xl font-bold leading-tight">Citizen access for civic complaint tracking.</h1>
            <div className="mt-8 grid max-w-md gap-3">
              {['Submit verified complaints', 'Track officer updates', 'Receive private notifications'].map(item => (
                <div key={item} className="flex items-center gap-3 rounded-md bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur">
                  <ShieldCheck size={18} className="text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className="w-full p-7 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                {isForgotMode ? <KeyRound size={24} /> : <LogIn size={24} />}
              </div>
              <h1 className="text-2xl font-bold text-slate-950">
                {isForgotMode ? 'Reset Password' : 'Citizen Login'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isForgotMode ? 'Request admin-assisted password reset.' : 'Sign in to continue.'}
              </p>
            </div>

            {error && (
              <div className={`mb-6 flex items-start gap-3 rounded-md border p-4 text-sm ${error.toLowerCase().includes('pending') ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <KeyRound size={18} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {isForgotMode ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Request Reset Link'}
                </Button>

                <button type="button" onClick={() => setIsForgotMode(false)} className="mx-auto flex items-center justify-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
                  <ArrowLeft size={16} /> Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <button type="button" onClick={() => setIsForgotMode(true)} className="text-xs font-semibold text-primary-700 hover:text-primary-800">Forgot password?</button>
                  </div>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>

                <div className="text-center text-sm text-slate-500">
                  New here? <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-800">Create account</Link>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
