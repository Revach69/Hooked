import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { X, PartyPopper, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MatchNotificationToast({ matchName, onDismiss, onSeeMatches }) {
  const navigate = useNavigate();

  const handleSeeMatchesClick = () => {
    if (onSeeMatches) onSeeMatches();
    navigate(createPageUrl('Matches'));
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-6 right-6 z-[100] w-full max-w-sm p-5 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 text-white rounded-xl shadow-2xl"
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 text-white/70 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-4">
        <PartyPopper className="w-10 h-10 text-yellow-300 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-bold">It's a Match!</h3>
          <p className="text-sm opacity-90">
            You and {matchName} liked each other.
          </p>
        </div>
      </div>

      <Button
        onClick={handleSeeMatchesClick}
        className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30"
      >
        See Matches <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}