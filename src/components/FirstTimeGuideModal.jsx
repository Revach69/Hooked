
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GUIDE_IMAGE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/9f8621f07_HOOKED-tips.png';

export default function FirstTimeGuideModal({ onClose }) {
  useEffect(() => {
    // Handle escape key to close the modal
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    // Prevent background from scrolling when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto'; // Restore scrolling on cleanup
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 dark:bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose} // Close modal on overlay click
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md bg-transparent rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
        >
          <img
            src={GUIDE_IMAGE_URL}
            alt="Hooked Tips Guide"
            className="block w-full h-auto object-contain rounded-lg"
          />
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            aria-label="Close guide"
          >
            <X className="w-6 h-6" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
