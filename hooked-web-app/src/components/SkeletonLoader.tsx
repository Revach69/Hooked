'use client';

import { motion } from 'framer-motion';
import { skeletonAnimations } from '@/lib/animations';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'pulse' | 'shimmer';
  rounded?: boolean | 'full';
}

export const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  className = '', 
  variant = 'pulse',
  rounded = false 
}: SkeletonProps) => {
  const roundedClass = rounded === 'full' ? 'rounded-full' : rounded ? 'rounded-md' : '';
  
  if (variant === 'shimmer') {
    return (
      <motion.div
        className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] ${roundedClass} ${className}`}
        style={{ width, height }}
        animate="shimmer"
        variants={skeletonAnimations}
      />
    );
  }

  return (
    <motion.div
      className={`bg-gray-200 ${roundedClass} ${className}`}
      style={{ width, height }}
      animate="pulse"
      variants={skeletonAnimations}
    />
  );
};

// Profile skeleton loader
export const ProfileSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Avatar */}
    <div className="flex justify-center">
      <Skeleton width={120} height={120} rounded="full" />
    </div>
    
    {/* Name and age */}
    <div className="space-y-2">
      <Skeleton width="60%" height="2rem" className="mx-auto" />
      <Skeleton width="40%" height="1.5rem" className="mx-auto" />
    </div>
    
    {/* Bio */}
    <div className="space-y-2">
      <Skeleton width="100%" height="1rem" />
      <Skeleton width="80%" height="1rem" />
      <Skeleton width="90%" height="1rem" />
    </div>
    
    {/* Photos grid */}
    <div className="grid grid-cols-3 gap-2">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} width="100%" height="120px" rounded />
      ))}
    </div>
    
    {/* Interests */}
    <div className="space-y-3">
      <Skeleton width="40%" height="1.5rem" />
      <div className="flex flex-wrap gap-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton 
            key={i} 
            width={`${60 + Math.random() * 40}px`} 
            height="2rem" 
            rounded="full" 
          />
        ))}
      </div>
    </div>
  </div>
);

// Card skeleton for discovery/matches
export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
    {/* Main image */}
    <Skeleton width="100%" height="300px" rounded />
    
    {/* Name and age */}
    <div className="space-y-2">
      <Skeleton width="70%" height="1.5rem" />
      <Skeleton width="50%" height="1rem" />
    </div>
    
    {/* Bio preview */}
    <div className="space-y-1">
      <Skeleton width="100%" height="0.875rem" />
      <Skeleton width="85%" height="0.875rem" />
    </div>
    
    {/* Interests preview */}
    <div className="flex gap-1">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} width="60px" height="1.5rem" rounded="full" />
      ))}
    </div>
  </div>
);

// Chat message skeleton
export const MessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-[75%] space-y-1`}>
      {!isOwn && (
        <Skeleton width="40px" height="40px" rounded="full" className="mb-2" />
      )}
      <div className={`p-3 rounded-2xl ${isOwn ? 'bg-purple-100' : 'bg-gray-100'}`}>
        <Skeleton width="120px" height="1rem" />
      </div>
      <Skeleton width="60px" height="0.75rem" className={isOwn ? 'ml-auto' : ''} />
    </div>
  </div>
);

// Match list skeleton
export const MatchListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3">
        <Skeleton width={60} height={60} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height="1.25rem" />
          <Skeleton width="50%" height="1rem" />
        </div>
        <Skeleton width={12} height={12} rounded="full" />
      </div>
    ))}
  </div>
);

// Event skeleton
export const EventSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton width="100%" height="200px" rounded />
    <div className="space-y-2">
      <Skeleton width="80%" height="1.5rem" />
      <Skeleton width="60%" height="1rem" />
    </div>
    <div className="space-y-1">
      <Skeleton width="100%" height="0.875rem" />
      <Skeleton width="90%" height="0.875rem" />
      <Skeleton width="70%" height="0.875rem" />
    </div>
    <div className="flex justify-between items-center pt-4">
      <Skeleton width="100px" height="1rem" />
      <Skeleton width="80px" height="2.5rem" rounded="full" />
    </div>
  </div>
);

// Form field skeleton
export const FormFieldSkeleton = () => (
  <div className="space-y-2">
    <Skeleton width="30%" height="1rem" />
    <Skeleton width="100%" height="2.5rem" rounded />
  </div>
);

// Navigation skeleton
export const NavigationSkeleton = () => (
  <div className="flex justify-around py-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex flex-col items-center space-y-1">
        <Skeleton width={24} height={24} />
        <Skeleton width="40px" height="0.75rem" />
      </div>
    ))}
  </div>
);

// Generic list skeleton
export const ListSkeleton = ({ 
  items = 5, 
  showAvatar = false, 
  showActions = false 
}: {
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3">
        {showAvatar && <Skeleton width={40} height={40} rounded="full" />}
        <div className="flex-1 space-y-1">
          <Skeleton width="70%" height="1rem" />
          <Skeleton width="50%" height="0.875rem" />
        </div>
        {showActions && <Skeleton width={20} height={20} />}
      </div>
    ))}
  </div>
);

// Loading card with shimmer effect
export const ShimmerCard = ({ children }: { children?: React.ReactNode }) => (
  <motion.div
    className="relative overflow-hidden bg-white rounded-lg shadow"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      animate={{
        x: ['-100%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
    />
    {children}
  </motion.div>
);

export default Skeleton;