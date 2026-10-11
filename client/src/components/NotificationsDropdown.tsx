import { useState, useEffect, useRef } from "react";
import { Bell, Check, BellRing } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await api.get<any[]>("/notifications");
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error("Failed to mark as read");
      }
    }
    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read");
    }
  };

  return (
    <div className="relative group" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5 relative"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px] stroke-[1.5px]" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-background"></span>
        )}
      </button>

      {!open && (
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
          Notifications
        </span>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border/50 rounded-xl shadow-2xl z-[100] overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <BellRing className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-4 text-left border-b border-border/10 hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <div className={`w-2 h-2 rounded-full ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                            {n.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-muted-foreground/60 block mt-2 font-medium">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border/50 bg-muted/10 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">End of notifications</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
