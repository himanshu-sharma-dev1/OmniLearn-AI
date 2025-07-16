import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../apiClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const toggleOpen = () => setIsOpen(!isOpen);

  const removeNotification = async (id) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await Promise.all(unreadIds.map(id => apiClient.put(`/notifications/${id}/read`)));
      
      const updatedNotifications = notifications.map(n => 
        unreadIds.includes(n.id) ? { ...n, is_read: true } : n
      );
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await apiClient.delete('/notifications');
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleOpen}
        className="relative"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-background bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg z-10 flex flex-col border"
          >
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="link"
                  size="sm"
                  className="text-primary"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <div className="flex-grow overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <p className="p-4 text-muted-foreground text-center">No new notifications.</p>
              ) : (
                <ul>
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`p-4 border-b border-border last:border-b-0 ${notification.is_read ? 'bg-muted/50 text-muted-foreground' : 'bg-card text-foreground'}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm flex-grow pr-2">{notification.message}</p>
                        <Button
                          onClick={() => removeNotification(notification.id)}
                          variant="ghost"
                          size="icon"
                          className="ml-2 text-muted-foreground hover:text-foreground"
                          aria-label="Remove notification"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-2 border-t border-border text-center">
                <Button
                  onClick={clearAllNotifications}
                  variant="link"
                  size="sm"
                  className="text-destructive w-full"
                >
                  Clear All Notifications
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;

