import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, UserPlus, DollarSign, Calendar } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';

interface Notification {
  id: string;
  type: 'message' | 'collaboration_request' | 'meeting' | 'deal' | 'document';
  content: string;
  link: string;
  isRead: boolean;
  actor: { id: string; name: string; avatarUrl?: string } | null;
  createdAt: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getNotifications().then(({ notifications }) => setNotifications(notifications)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={16} className="text-primary-600" />;
      case 'collaboration_request':
        return <UserPlus size={16} className="text-secondary-600" />;
      case 'deal':
        return <DollarSign size={16} className="text-accent-600" />;
      case 'meeting':
        return <Calendar size={16} className="text-success-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await api.markNotificationRead(notification.id);
      setNotifications(prev => prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n)));
    }
    if (notification.link) navigate(notification.link);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with your network activity</p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-8 text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600">No notifications yet</p>
            <p className="text-sm text-gray-500 mt-1">Activity from messages, requests, meetings, and deals will show up here</p>
          </div>
        ) : (
          notifications.map(notification => (
            <Card
              key={notification.id}
              className={`transition-colors duration-200 cursor-pointer ${
                !notification.isRead ? 'bg-primary-50' : ''
              }`}
              onClick={() => handleClick(notification)}
            >
              <CardBody className="flex items-start p-4">
                {notification.actor ? (
                  <Avatar
                    src={notification.actor.avatarUrl}
                    alt={notification.actor.name}
                    size="md"
                    className="flex-shrink-0 mr-4"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-4 flex-shrink-0">
                    <Bell size={18} className="text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900">{notification.content}</p>
                    {!notification.isRead && (
                      <Badge variant="primary" size="sm" rounded>New</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    {getNotificationIcon(notification.type)}
                    <span>{timeAgo(notification.createdAt)}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
