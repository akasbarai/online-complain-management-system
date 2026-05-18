import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner } from '../components/ui';
import { NotificationService } from '../services/api';
import { Notification } from '../types';
import { Bell, Calendar, RefreshCw } from 'lucide-react';

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationService.getAll();
      setNotifications(data);
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
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="premium-panel flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">System updates and announcements</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchNotifications}>
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 && !loading && (
          <Card className="p-10 text-center text-slate-500">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-ink-950 text-white">
              <Bell size={30} />
            </div>
            <p className="font-bold text-ink-950">No notifications found.</p>
            <p className="mt-1 text-sm">You are all caught up.</p>
          </Card>
        )}

        {notifications.map((notif) => (
          <Card key={notif.id} className="flex items-start space-x-4 p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-premium">
            <div className="shrink-0 rounded-lg bg-ink-950 p-3 text-white">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-bold text-ink-950">{notif.title}</h3>
                <span className="flex items-center text-xs font-medium text-slate-500">
                  <Calendar size={12} className="mr-1" />
                  {new Date(notif.date).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{notif.message}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
