
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, User, Bell, Menu, X } from 'lucide-react';
import { AttentionService, AuthService, NotificationService } from '../services/api';
import { Toast } from './ui';

const AttentionBadge = ({ count }: { count?: number }) => {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold leading-4 text-white shadow-sm shadow-red-950/20">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const NavItem = ({ to, icon: Icon, label, count }: { to: string, icon: any, label: string, count?: number }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center space-x-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all ${
        isActive 
          ? 'bg-white text-ink-950 shadow-panel' 
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen font-sans">
      {toast && (
        <Toast 
          title={toast.title} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-300/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mr-1 rounded-md p-2 text-ink-800 hover:bg-slate-100 md:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-950 font-bold text-white shadow-md shadow-ink-950/20">C</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink-950 sm:text-xl">CivicResolve</h1>
              <p className="hidden text-xs font-semibold text-slate-500 sm:block">Citizen service portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
             <button
               type="button"
               onClick={() => navigate('/notifications')}
               className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-800"
               aria-label="Open notifications"
             >
                <Bell size={20} />
                {!!attention.notifications && <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-5 text-white border-2 border-white">{attention.notifications > 99 ? '99+' : attention.notifications}</span>}
             </button>
             <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-6">
                <div className="text-right hidden sm:block">
                   <p className="text-sm font-bold text-ink-950">{user?.name}</p>
                   <p className="text-xs text-slate-500">Citizen</p>
                </div>
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-primary-100"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-primary-100 font-bold text-primary-700 shadow-sm ring-2 ring-primary-100">
                     {user?.name.charAt(0)}
                  </div>
                )}
             </div>
          </div>
        </div>
      </header>
      
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 md:grid-cols-12 lg:gap-8 lg:py-8">
         {/* Sidebar Navigation */}
         <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:col-span-3 md:block lg:col-span-2`}>
          <div className="rounded-lg border border-white/10 bg-ink-950 p-2 shadow-premium">
            <div className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Menu</div>
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" count={attention.dashboard} />
            <NavItem to="/lodge" icon={PlusCircle} label="New Complaint" />
            <NavItem to="/notifications" icon={Bell} label="Notifications" count={attention.notifications} />
            
            <div className="mb-2 mt-6 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Account</div>
            <NavItem to="/profile" icon={User} label="My Profile" count={attention.profile} />
            <button 
               onClick={handleLogout} 
               className="mt-2 flex w-full items-center space-x-3 rounded-lg px-3 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/15 hover:text-white"
            >
               <LogOut size={18} />
               <span>Sign Out</span>
            </button>
          </div>
         </aside>

         {/* Main Content Area */}
         <main className="min-w-0 md:col-span-9 lg:col-span-10">
            <Outlet />
         </main>
      </div>
    </div>
  );
};
