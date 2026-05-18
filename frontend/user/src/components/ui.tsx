
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("rounded-lg border border-slate-200/80 bg-white shadow-panel ring-1 ring-white/70", className)}>{children}</div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'; size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-600 text-white shadow-glow hover:bg-primary-700',
      secondary: 'bg-ink-900 text-white shadow-panel hover:bg-ink-950',
      danger: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700',
      outline: 'border border-slate-300 bg-white text-ink-800 shadow-sm hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800',
      ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink-900',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    return <button ref={ref} className={cn("inline-flex items-center justify-center rounded-md font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />;
  }
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 placeholder:text-slate-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-slate-500", className)} {...props} />
));

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 placeholder:text-slate-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100", className)} {...props} />
));

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100", className)} {...props} />
));

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary'; className?: string }> = ({ children, variant = 'default', className }) => {
  const styles = {
    default: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200',
    success: 'bg-civic-100 text-civic-700 ring-1 ring-civic-500/15',
    warning: 'bg-amberline-100 text-amberline-600 ring-1 ring-amberline-500/15',
    danger: 'bg-red-100 text-red-800 ring-1 ring-red-500/15',
    secondary: 'bg-slate-200 text-slate-800 ring-1 ring-slate-300',
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", styles[variant], className)}>{children}</span>;
};

export const Toast: React.FC<{ title: string; message: string; onClose: () => void }> = ({ title, message, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-lg border border-white/10 bg-ink-900 p-4 text-white shadow-2xl animate-in slide-in-from-top-2 fade-in">
      <div className="flex-1">
        <h4 className="font-semibold text-sm text-white">{title}</h4>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">&times;</button>
    </div>
  );
};

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <div className={cn("flex justify-center items-center", className)}>
    <div
      className="animate-spin rounded-full border-4 border-primary-100 border-t-primary-600"
      style={{ width: size, height: size }}
    />
  </div>
);
