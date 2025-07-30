
import React, { useEffect } from 'react';
import { X, Heart, Calendar, Ruler, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ProfileDetailModal({ profile, onClose, onLike, isLiked }) {
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

  const { profile_photo_url, profile_color, first_name, age, height, interests, bio } = profile;
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
          className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the modal content
        >
          {/* Header with Photo */}
          <div className="relative">
            {profile_photo_url ? (
              <>
                <img
                  src={profile_photo_url}
                  alt={`${first_name}'s profile photo`}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Hide the broken image and show fallback avatar
                    e.target.style.display = 'none';
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                {/* Fallback avatar for error cases */}
                <div
                  className="w-full h-80 flex items-center justify-center text-white font-bold text-6xl absolute inset-0"
                  style={{
                    backgroundColor: profile_color || '#cccccc',
                    display: 'none'
                  }}
                >
                  {avatarInitial}
                </div>
              </>
            ) : (
              <div
                className="w-full h-80 flex items-center justify-center text-white font-bold text-6xl"
                style={{ backgroundColor: profile_color || '#cccccc' }}
              >
                {avatarInitial}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
              aria-label="Close profile"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-6">
            {/* Name and Age */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{first_name}</h2>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                {age && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{age} years old</span>
                  </div>
                )}
                {height && (
                  <div className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    <span>{height} cm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {bio && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{bio}</p>
              </div>
            )}

            {/* Interests */}
            {interests && interests.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="rounded-full border-purple-200 dark:border-purple-600 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={onLike}
                disabled={isLiked}
                className={`w-full rounded-xl py-3 transition-all ${
                  isLiked
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white'
                }`}
              >
                <Heart className={`w-5 h-5 mr-2 ${isLiked ? '' : 'hover:fill-current'}`} />
                {isLiked ? 'Already Liked' : `Like ${first_name}`}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
