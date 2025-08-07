import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { X, Heart, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/use-mobile';

export default function MatchNotificationToast({ matchName, onDismiss, onSeeMatches }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

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
      className={`fixed bottom-6 right-6 z-[100] w-full max-w-sm p-6 rounded-xl shadow-2xl ${
        isDark 
          ? 'bg-gray-800 border border-gray-700 text-white' 
          : 'bg-white border border-gray-200 text-gray-900'
      }`}
    >
      <button
        onClick={onDismiss}
        className={`absolute top-4 right-4 p-1 rounded-full ${
          isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Dismiss notification"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-4">
        <Heart className="w-8 h-8 text-red-500 flex-shrink-0" fill="currentColor" />
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">You got Hooked!</h3>
          <p className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            You and {matchName} liked each other.
          </p>
        </div>
      </div>

      <Button
        onClick={handleSeeMatchesClick}
        className={`mt-4 w-full ${
          isDark 
            ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
        }`}
      >
        See Matches <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}