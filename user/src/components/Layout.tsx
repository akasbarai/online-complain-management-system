
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { FileText, LayoutDashboard, PlusCircle, LogOut, User, Bell, Menu, X, ShieldCheck } from 'lucide-react';
import { AttentionService, AuthService, NotificationService } from '../services/api';
import { Toast } from './ui';

const AttentionBadge = ({ count }: { count?: number }) => {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-primary-600 px-1.5 py-0.5 text-center text-xs font-bold leading-4 text-white shadow-sm shadow-primary-600/20">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const NavItem = ({ to, icon: Icon, label, count, onClick }: { to: string, icon: any, label: string, count?: number, onClick?: () => void }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
        isActive 
          ? 'border border-primary-100 bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/60'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
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
    window.addEventListener('ocms:notifications-read', loadAttention);
    const interval = setInterval(loadAttention, 10000);
    return () => {
      window.removeEventListener('ocms:notifications-read', loadAttention);
      clearInterval(interval);
    };
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

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'C';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_42%,#f8fafc_100%)] font-sans text-slate-950">
      {toast && (
        <Toast 
          title={toast.title} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/50 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="mr-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileNavOpen(value => !value)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-600 font-bold text-white shadow-sm shadow-primary-600/20">O</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950">OCMS</h1>
              <p className="hidden text-xs font-medium text-slate-500 sm:block">Citizen workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5">
             <button
               type="button"
               onClick={() => navigate('/notifications')}
               className="relative rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-700"
               aria-label="Open notifications"
             >
                <Bell size={20} />
                {!!attention.notifications && <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-white bg-primary-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{attention.notifications > 99 ? '99+' : attention.notifications}</span>}
             </button>
             <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-5">
                <div className="text-right hidden sm:block">
                   <p className="max-w-40 truncate text-sm font-semibold text-slate-950">{user?.name}</p>
                   <p className="text-xs text-slate-500">Verified Citizen</p>
                </div>
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name}
                    className="h-9 w-9 rounded-full border border-primary-200 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-200 bg-primary-50 font-bold text-primary-700">
                     {userInitial}
                  </div>
                )}
             </div>
          </div>
        </div>
      </header>
      
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 md:grid-cols-12 lg:gap-8 lg:py-8">
         <aside className={`${mobileNavOpen ? 'block' : 'hidden'} md:col-span-3 md:block lg:col-span-2`}>
            <div className="sticky top-24 rounded-lg border border-slate-200/80 bg-white/90 p-3 shadow-sm shadow-slate-200/70 backdrop-blur">
              <div className="mb-3 rounded-md border border-primary-100 bg-primary-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary-800">
                  <ShieldCheck size={15} />
                  Active citizen account
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">{user?.name || 'Citizen'}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <nav className="space-y-1">
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" count={attention.dashboard} onClick={() => setMobileNavOpen(false)} />
                <NavItem to="/lodge" icon={PlusCircle} label="New Complaint" onClick={() => setMobileNavOpen(false)} />
                <NavItem to="/notifications" icon={Bell} label="Notifications" count={attention.notifications} onClick={() => setMobileNavOpen(false)} />
                <NavItem to="/profile" icon={User} label="My Profile" count={attention.profile} onClick={() => setMobileNavOpen(false)} />
              </nav>
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <div className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
                  <FileText size={14} />
                  Complaint desk
                </div>
                Submit a report with location and evidence, then track status updates here.
              </div>
              <button
                 onClick={handleLogout}
                 className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                 <LogOut size={18} />
                 <span>Sign Out</span>
              </button>
            </div>
         </aside>

         <main className="min-w-0 md:col-span-9 lg:col-span-10">
            <Outlet />
         </main>
      </div>
    </div>
  );
};
