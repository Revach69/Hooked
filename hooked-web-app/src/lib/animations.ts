'use client';

import { Variants, Transition } from 'framer-motion';

/**
 * Comprehensive animation library for mobile-first UI/UX
 * Optimized for 60 FPS performance on mobile devices
 */

// Base easing functions for consistent animation feel
export const easings = {
  // Apple-inspired easing curves for smooth, premium feel
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeInCubic: [0.55, 0.055, 0.675, 0.19],
  // Spring-based easings for organic motion
  spring: { type: "spring", stiffness: 100, damping: 15 },
  springBouncy: { type: "spring", stiffness: 200, damping: 10 },
  springSoft: { type: "spring", stiffness: 50, damping: 20 },
} as const;

// Duration constants for consistent timing
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

// Page transition animations
export const pageTransitions: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 1.02,
    transition: {
      duration: durations.fast,
      ease: easings.easeInCubic,
    },
  },
};

// Slide transitions for navigation
export const slideTransitions: Variants = {
  slideInRight: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  slideInLeft: {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  slideInUp: {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  slideInDown: {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
};

// Button and interactive element animations
export const buttonAnimations: Variants = {
  tap: {
    scale: 0.95,
    transition: { duration: 0.1, ease: "easeInOut" },
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
  loading: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Enhanced feedback animations
export const feedbackAnimations: Variants = {
  success: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 0.5, ease: easings.easeOutCubic },
  },
  error: {
    x: [-5, 5, -5, 5, 0],
    transition: { duration: 0.4, ease: "easeInOut" },
  },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// List and stagger animations
export const listAnimations: Variants = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  item: {
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
        duration: durations.normal,
        ease: easings.easeOutCubic,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: durations.fast,
        ease: easings.easeInCubic,
      },
    },
  },
};

// Card animations for discovery and matches
export const cardAnimations: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 50,
    rotateY: -15,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateY: 0,
    transition: {
      duration: durations.slow,
      ease: easings.spring,
    },
  },
  hover: {
    scale: 1.02,
    rotateY: 2,
    transition: {
      duration: durations.fast,
      ease: easings.easeOutCubic,
    },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Modal and overlay animations
export const modalAnimations: Variants = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  modal: {
    initial: {
      opacity: 0,
      scale: 0.75,
      y: 50,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.75,
      y: 50,
      transition: {
        duration: durations.fast,
        ease: easings.easeInCubic,
      },
    },
  },
};

// Form animations
export const formAnimations: Variants = {
  field: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    focus: {
      scale: 1.01,
      borderColor: "#9333ea",
      boxShadow: "0 0 0 2px rgba(147, 51, 234, 0.2)",
      transition: { duration: 0.2 },
    },
    error: {
      x: [-2, 2, -2, 2, 0],
      borderColor: "#ef4444",
      transition: { duration: 0.3 },
    },
    success: {
      borderColor: "#10b981",
      boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
      transition: { duration: 0.3 },
    },
  },
};

// Skeleton loader animations
export const skeletonAnimations: Variants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  shimmer: {
    backgroundPosition: ["-200px 0", "calc(200px + 100%) 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Toast notification animations
export const toastAnimations: Variants = {
  initial: {
    opacity: 0,
    y: -100,
    scale: 0.3,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -100,
    scale: 0.5,
    transition: {
      duration: durations.fast,
      ease: easings.easeInCubic,
    },
  },
};

// Floating action button animations
export const fabAnimations: Variants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: { duration: 0.2 },
  },
  tap: { scale: 0.9 },
  pulse: {
    scale: [1, 1.2, 1],
    boxShadow: [
      "0 0 0 0 rgba(147, 51, 234, 0.7)",
      "0 0 0 20px rgba(147, 51, 234, 0)",
      "0 0 0 0 rgba(147, 51, 234, 0)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};

// Loading spinner animations
export const loadingAnimations: Variants = {
  spin: {
    rotate: [0, 360],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
  bounce: {
    y: [0, -20, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  dots: {
    scale: [1, 1.5, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Navigation animations
export const navAnimations: Variants = {
  container: {
    initial: { y: 100 },
    animate: {
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1,
      },
    },
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
    hover: {
      scale: 1.1,
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.95 },
  },
};

// Utility function for creating custom transitions
export const createTransition = (
  duration: number = durations.normal,
  easing: any = easings.easeOutCubic,
  delay: number = 0
): Transition => ({
  duration,
  ease: easing,
  delay,
});

// Utility function for creating spring transitions
export const createSpring = (
  stiffness: number = 100,
  damping: number = 15,
  mass: number = 1
): Transition => ({
  type: "spring",
  stiffness,
  damping,
  mass,
});

// Utility for responsive animations based on screen size
export const responsiveAnimation = (
  mobile: any,
  desktop: any = mobile
) => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768 ? mobile : desktop;
  }
  return mobile;
};

// Haptic feedback simulation for web
export const simulateHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
    };
    navigator.vibrate(patterns[type]);
  }
};

// Performance-optimized animation variants
export const perfAnimations = {
  // Use transform instead of position changes for better performance
  slideTransform: {
    initial: { transform: "translateX(100%)" },
    animate: { transform: "translateX(0%)" },
    exit: { transform: "translateX(-100%)" },
  },
  // GPU-accelerated opacity changes
  fadeTransform: {
    initial: { opacity: 0, transform: "translateZ(0)" },
    animate: { opacity: 1, transform: "translateZ(0)" },
    exit: { opacity: 0, transform: "translateZ(0)" },
  },
  // Scale animations with transform origin
  scaleCenter: {
    initial: { scale: 0.8, transformOrigin: "center" },
    animate: { scale: 1, transformOrigin: "center" },
    exit: { scale: 0.8, transformOrigin: "center" },
  },
};