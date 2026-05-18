import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { Input, Button, Modal } from '../components/ui';
import { AuthService } from '../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="bg-slate-50 p-8 border-b border-slate-100 flex flex-col items-center">
          <div className="bg-primary-600 p-3 rounded-full mb-4 shadow-lg shadow-primary-500/30">
            <Shield className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Officer Portal</h2>
          <p className="text-slate-500 mt-2 text-sm text-center">Secure access for authorized personnel</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200 flex items-center">
              <span className="font-semibold mr-1">Error:</span> {error}
            </div>
          )}
          
          <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs border border-blue-100 mb-4">
            <strong>Demo Note:</strong> Officers created in the Admin Panel are synced here. Use the password generated during creation.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Official Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="officer@civic.gov" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            <div className="flex justify-end mt-1">
               <button 
                 type="button" 
                 onClick={() => setShowForgotModal(true)}
                 className="text-xs text-primary-600 hover:text-primary-800 font-medium"
               >
                 Forgot Password?
               </button>
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing In...' : 'Secure Login'}
          </Button>
        </form>
      </div>

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
