import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Input, Button } from '../components/ui';
import { AuthService } from '../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setErrors({});
    setLoading(true);
    try {
      await AuthService.login(email, password);
      navigate('/');
    } catch (err: any) {
      setErrors({ general: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="bg-slate-50 p-8 border-b border-slate-100 flex flex-col items-center">
          <div className="bg-primary-600 p-3 rounded-full mb-4 shadow-lg shadow-primary-500/30">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Portal</h2>
          <p className="text-slate-500 mt-2 text-sm text-center">Secure access for authorized personnel only</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {errors.general && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errors.general}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <Input 
              type="email" 
              value={email} 
              placeholder="Enter your email address."
              onChange={e => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }} 
              className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
              required 
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <Input 
              type="password" 
              value={password} 
              placeholder="enter password"
              onChange={e => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }} 
              className={errors.password ? 'border-red-500 focus:ring-red-500' : ''}
              required 
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          
          <div className="text-center text-xs text-slate-400 mt-4">
             By logging in, you agree to the confidentiality policy.
          </div>
        </form>
      </div>
    </div>
  );
};
