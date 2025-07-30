import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { X, MessageCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MessageNotificationToast({ senderName, senderSessionId, onDismiss, onView }) {
  const navigate = useNavigate();

  const handleViewClick = () => {
    if (onView) onView();
    // Navigate to matches page with a URL parameter to auto-open the specific chat
    navigate(createPageUrl(`Matches?openChat=${senderSessionId}`));
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-6 right-6 z-[100] w-full max-w-sm p-5 bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-600 text-white rounded-xl shadow-2xl"
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 text-white/70 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-4">
        <MessageCircle className="w-10 h-10 text-white/80 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-bold">New Message</h3>
          <p className="text-sm opacity-90">
            You have a new message from {senderName}.
          </p>
        </div>
      </div>

      <Button
        onClick={handleViewClick}
        className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30"
      >
        View Message <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}