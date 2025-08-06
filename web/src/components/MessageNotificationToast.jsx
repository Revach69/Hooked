import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MessageNotificationToast({ senderName, senderSessionId, onDismiss, onView }) {
  const navigate = useNavigate();

  const handleView = () => {
    if (senderSessionId) {
      // Navigate to specific chat
      navigate(`/chat?matchId=${senderSessionId}&matchName=${senderName}`);
    } else {
      // Fallback to matches page
      navigate(createPageUrl("Matches"));
    }
    onView();
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Heart className="h-6 w-6 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            New Message! 💬
          </p>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-1">
            {senderName} sent you a message!
          </p>
        </div>
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleView}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors"
          >
            View
          </button>
          <button
            onClick={onDismiss}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}