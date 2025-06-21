import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImagePreviewModal({ profile, onClose }) {
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto'; // Restore scrolling
    };
  }, [onClose]);

  if (!profile) return null;

  const { profile_photo_url, profile_color, first_name } = profile;
  const avatarInitial = first_name ? first_name[0].toUpperCase() : '?';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 dark:bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose} // Close on overlay click
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative max-w-[90vw] max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image/modal content itself
        >
          {profile_photo_url ? (
            <img
              src={profile_photo_url}
              alt={`${first_name}'s profile photo`}
              className="block object-contain w-full h-full max-w-full max-h-full"
            />
          ) : (
            <div
              className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] flex items-center justify-center text-white font-bold text-8xl sm:text-9xl"
              style={{ backgroundColor: profile_color || '#cccccc' }}
            >
              {avatarInitial}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}