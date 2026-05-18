
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components/ui';
import { Clock, ShieldCheck } from 'lucide-react';

export const VerifyAccount = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 text-primary-600">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Verification Required</h2>
          <p className="text-slate-600 mb-6">
            Citizen accounts are activated only after an admin reviews the submitted ID document.
          </p>
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
            <Clock className="text-yellow-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-yellow-800">
              If your registration is already approved, sign in with your email and password. Pending accounts cannot access the portal.
            </p>
          </div>
          <Link to="/login" className="w-full">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
