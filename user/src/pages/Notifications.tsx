import React, { useEffect, useState } from 'react';
import { Bell, Calendar, Inbox, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { NotificationService } from '../services/api';
import { Notification } from '../types';

const priorityTone = (priority?: Notification['priority']): 'default' | 'warning' | 'danger' => {
  if (priority === 'Urgent') return 'danger';
  if (priority === 'Important') return 'warning';
  return 'default';
};

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationService.getAll();
      const unreadNotifications = data.filter((notification: Notification) => !notification.read);
      if (unreadNotifications.length > 0) {
        await Promise.allSettled(unreadNotifications.map((notification: Notification) => NotificationService.markAsRead(notification.id)));
      }
      setNotifications(data.map((notification: Notification) => ({ ...notification, read: true })));
      window.dispatchEvent(new Event('ocms:notifications-read'));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm shadow-primary-100/70">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="page-kicker">Inbox</p>
            <h1 className="mt-2 page-title">Notifications</h1>
            <p className="page-subtitle">Updates from OCMS and assigned officers.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchNotifications} className="gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center p-12 text-center text-slate-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={34} />
            </div>
            <p className="font-medium text-slate-700">No notifications found.</p>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {notifications.map((notif) => (
            <div key={notif.id} className="flex gap-4 p-5 transition-colors hover:bg-primary-50/35">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700 ring-1 ring-primary-100">
                <Bell size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{notif.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{notif.message}</p>
                  </div>
                  {notif.priority && <Badge variant={priorityTone(notif.priority)}>{notif.priority}</Badge>}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Calendar size={12} />
                  {new Date(notif.date).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
