'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { pageTransitions, slideTransitions, durations } from '@/lib/animations';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  transitionType?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown';
  duration?: number;
  disabled?: boolean;
}

export default function PageTransition({
  children,
  className = '',
  transitionType = 'fade',
  duration = durations.normal,
  disabled = false,
}: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (disabled) {
      setDisplayChildren(children);
      return;
    }

    setIsAnimating(true);
    const timeout = setTimeout(() => {
      setDisplayChildren(children);
      setIsAnimating(false);
    }, duration * 1000 / 2);

    return () => clearTimeout(timeout);
  }, [children, duration, disabled]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  const getVariants = () => {
    switch (transitionType) {
      case 'slide':
        return {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 },
        };
      case 'slideUp':
        return slideTransitions.slideInUp;
      case 'slideDown':
        return slideTransitions.slideInDown;
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.05 },
        };
      default: // fade
        return pageTransitions;
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className={className}
        variants={getVariants()}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration,
          ease: [0.645, 0.045, 0.355, 1],
        }}
        onAnimationStart={() => setIsAnimating(true)}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        {displayChildren}
      </motion.div>
    </AnimatePresence>
  );
}

// Route-specific transitions based on navigation direction
export const RouteTransition = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  const [direction, setDirection] = useState<'forward' | 'backward' | 'none'>('none');

  useEffect(() => {
    // Simple logic to determine navigation direction
    const routeOrder = ['/', '/discovery', '/matches', '/chat', '/profile', '/event'];
    const currentIndex = routeOrder.indexOf(pathname);
    const prevIndex = routeOrder.indexOf(prevPath);

    if (currentIndex > prevIndex) {
      setDirection('forward');
    } else if (currentIndex < prevIndex) {
      setDirection('backward');
    } else {
      setDirection('none');
    }

    setPrevPath(pathname);
  }, [pathname, prevPath]);

  const getSlideDirection = () => {
    switch (direction) {
      case 'forward':
        return {
          initial: { x: '100%', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '-100%', opacity: 0 },
        };
      case 'backward':
        return {
          initial: { x: '-100%', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '100%', opacity: 0 },
        };
      default:
        return pageTransitions;
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={getSlideDirection()}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: 0.3,
          ease: [0.645, 0.045, 0.355, 1],
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Stagger children animation wrapper
export const StaggerContainer = ({
  children,
  staggerDelay = 0.1,
  className = '',
}: {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial="initial"
    animate="animate"
    variants={{
      animate: {
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// Individual stagger item
export const StaggerItem = ({
  children,
  className = '',
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) => (
  <motion.div
    className={className}
    variants={{
      initial: {
        opacity: 0,
        y: 20,
        scale: 0.95,
      },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.4,
          ease: [0.645, 0.045, 0.355, 1],
          delay: index * 0.05, // Small additional delay based on index
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// Modal/overlay transition
export const ModalTransition = ({
  children,
  isOpen,
  onClose,
  className = '',
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        {/* Modal content */}
        <motion.div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${className}`}
          initial={{ opacity: 0, scale: 0.75, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 50 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Loading transition overlay
export const LoadingTransition = ({
  isLoading,
  loadingText = "Loading...",
  children,
}: {
  isLoading: boolean;
  loadingText?: string;
  children: ReactNode;
}) => (
  <div className="relative">
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center space-y-3">
            <motion.div
              className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.p
              className="text-sm text-gray-600"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {loadingText}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    
    <motion.div
      animate={{
        filter: isLoading ? "blur(2px)" : "blur(0px)",
        scale: isLoading ? 0.98 : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  </div>
);

// Scroll-triggered animations
export const ScrollReveal = ({
  children,
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  className = '',
}: {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    const element = document.querySelector(`[data-scroll-reveal]`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <motion.div
      data-scroll-reveal
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: [0.645, 0.045, 0.355, 1] }}
    >
      {children}
    </motion.div>
  );
};