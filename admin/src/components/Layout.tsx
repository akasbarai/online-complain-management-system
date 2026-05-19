
import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, GitFork, Users, 
  FileText, BarChart3, Bell, UserCheck, LogOut, MessageSquareWarning 
} from 'lucide-react';
import { AttentionService, AuthService, NotificationService } from '../services/api';
import { Toast } from './ui';

interface LayoutProps {
  children: React.ReactNode;
}

const AttentionBadge = ({ count }: { count?: number }) => {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold leading-4 text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const SidebarItem = ({ to, icon: Icon, label, count }: { to: string, icon: any, label: string, count?: number }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-primary-600 text-white shadow-md' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`
    }
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    <AttentionBadge count={count} />
  </NavLink>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [loginTime, setLoginTime] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@ocms.com');
  
  // Notification State
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [attention, setAttention] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const storedTime = localStorage.getItem('lastLogin');
    const storedEmail = localStorage.getItem('adminEmail');
    if (storedEmail) {
      setAdminEmail(storedEmail);
    }
    const date = storedTime ? new Date(storedTime) : new Date();
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) {
      setLoginTime(`Today, ${timeStr}`);
    } else {
      setLoginTime(`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`);
    }

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

  // Poll for notifications
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
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
        // New notification found!
        const latest = all[0];
        setToast({ title: latest.title, message: latest.message });
        playSound();
        setLastNotificationCount(all.length);
      }
    }, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, [lastNotificationCount]);

  const handleLogout = () => {
    AuthService.logout();
    localStorage.removeItem('lastLogin');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {toast && (
        <Toast 
          title={toast.title} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <MessageSquareWarning className="text-primary-500 mr-2" size={28} />
          <h1 className="text-lg font-bold tracking-wide">OCMS</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/departments" icon={Building2} label="Departments" count={attention.departments} />
          <SidebarItem to="/hierarchy" icon={GitFork} label="Hierarchy" count={attention.hierarchy} />
          <SidebarItem to="/officers" icon={UserCheck} label="Officers" count={attention.officers} />
          <SidebarItem to="/complaints" icon={FileText} label="Complaints" count={attention.complaints} />
          <SidebarItem to="/reports" icon={BarChart3} label="Reports & Analytics" />
          <SidebarItem to="/users" icon={Users} label="Manage Users" count={attention.users} />
          <SidebarItem to="/notifications" icon={Bell} label="Notifications" count={attention.notifications} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold uppercase">
              {adminEmail.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">System Admin</p>
              <p className="text-xs text-slate-400 truncate" title={adminEmail}>{adminEmail}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-md transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Administrator Portal</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">Last login: {loginTime}</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
