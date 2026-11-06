import React from 'react';
import { Bell, CheckCircle2, XCircle, CreditCard, Send, X } from 'lucide-react';
import { FcmNotification } from '../data/mockData';

interface NotificationToastProps {
  notification: FcmNotification | null;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'attendance':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'fee':
        return <CreditCard className="w-5 h-5 text-indigo-400" />;
      case 'announcement':
        return <Send className="w-5 h-5 text-amber-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
              Firebase Cloud Messaging (FCM)
            </span>
            <span className="text-[10px] text-slate-400">just now</span>
          </div>
          <h4 className="text-xs font-bold text-white mt-0.5 truncate">
            {notification.title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {notification.body}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
