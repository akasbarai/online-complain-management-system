
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner } from '../components/ui';
import { NotificationService } from '../services/api';
import { Notification } from '../types';
import { Bell, Calendar, Search, RefreshCw } from 'lucide-react';

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">System updates and assignment alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchNotifications}>
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 && !loading && (
          <Card className="p-8 text-center text-slate-500">
            <Bell size={48} className="mx-auto mb-3 opacity-20" />
            <p>No notifications found.</p>
          </Card>
        )}

        {notifications.map((notif) => (
          <Card key={notif.id} className="p-4 flex items-start space-x-4 hover:shadow-md transition-shadow">
            <div className="p-3 rounded-full shrink-0 bg-blue-50 text-blue-600">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-slate-900">{notif.title}</h3>
                <span className="text-xs text-slate-400 flex items-center">
                  <Calendar size={12} className="mr-1" />
                  {new Date(notif.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-600 mt-1 text-sm">{notif.message}</p>
              <div className="mt-2 flex gap-2">
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">Target: {notif.target}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
