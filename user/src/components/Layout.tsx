
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, User, Bell } from 'lucide-react';
import { AttentionService, AuthService, NotificationService } from '../services/api';
import { Toast } from './ui';

const AttentionBadge = ({ count }: { count?: number }) => {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold leading-4 text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const NavItem = ({ to, icon: Icon, label, count }: { to: string, icon: any, label: string, count?: number }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
        isActive 
          ? 'bg-white text-primary-700 shadow-sm border border-slate-100' 
          : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
      }`
    }
  >
    <Icon size={18} />
    <span>{label}</span>
    <AttentionBadge count={count} />
  </NavLink>
);

export const Layout = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  
  // Notification State
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [attention, setAttention] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initNotificationCount = async () => {
      try {
        const notifications = await NotificationService.getAll();
        setLastNotificationCount(notifications.length);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    initNotificationCount();
  }, []);

  useEffect(() => {
    const loadAttention = async () => {
      try {
        setAttention(await AttentionService.getSummary());
      } catch (err) {
        console.error('Failed to load attention summary:', err);
      }
    };

    loadAttention();
    const interval = setInterval(loadAttention, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const playSound = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle'; // Different tone for user
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        console.error("Audio play failed", e);
      }
    };

    const interval = setInterval(async () => {
      let all = [];
      try {
        all = await NotificationService.getAll();
      } catch (err) {
        console.error('Failed to refresh notifications:', err);
        return;
      }
      if (all.length > lastNotificationCount) {
        const latest = all[0];
        setToast({ title: latest.title, message: latest.message });
        playSound();
        setLastNotificationCount(all.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [lastNotificationCount]);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {toast && (
        <Toast 
          title={toast.title} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">C</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CivicResolve <span className="text-slate-400 font-normal text-sm hidden sm:inline">| Citizen Portal</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="relative cursor-pointer text-slate-500 hover:text-primary-600 transition-colors">
                <Bell size={20} />
                {!!attention.notifications && <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-5 text-white border-2 border-white">{attention.notifications > 99 ? '99+' : attention.notifications}</span>}
             </div>
             <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                   <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                   <p className="text-xs text-slate-500">Citizen</p>
                </div>
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-primary-200"
                  />
                ) : (
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                     {user?.name.charAt(0)}
                  </div>
                )}
             </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
         {/* Sidebar Navigation */}
         <aside className="md:col-span-3 lg:col-span-2 space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Menu</div>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" count={attention.dashboard} />
            <NavItem to="/lodge" icon={PlusCircle} label="New Complaint" />
            <NavItem to="/notifications" icon={Bell} label="Notifications" count={attention.notifications} />
            
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-4">Account</div>
            <NavItem to="/profile" icon={User} label="My Profile" count={attention.profile} />
            <button 
               onClick={handleLogout} 
               className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-2"
            >
               <LogOut size={18} />
               <span>Sign Out</span>
            </button>
         </aside>

         {/* Main Content Area */}
         <main className="md:col-span-9 lg:col-span-10">
            <Outlet />
         </main>
      </div>
    </div>
  );
};
