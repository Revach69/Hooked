'use client';

import { motion, MotionProps } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { buttonAnimations, simulateHaptic } from '@/lib/animations';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  hapticFeedback?: boolean;
  animationType?: 'scale' | 'bounce' | 'pulse' | 'glow';
  fullWidth?: boolean;
  motionProps?: MotionProps;
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  hapticFeedback = true,
  animationType = 'scale',
  fullWidth = false,
  motionProps = {},
  className = '',
  onClick,
  disabled,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 shadow-lg hover:shadow-xl',
    outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50 focus:ring-purple-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg hover:shadow-xl',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-lg hover:shadow-xl',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const getAnimationVariants = () => {
    switch (animationType) {
      case 'bounce':
        return {
          whileTap: { scale: 0.95, y: 2 },
          whileHover: { scale: 1.02, y: -1 },
          transition: { type: "spring", stiffness: 400, damping: 10 },
        };
      case 'pulse':
        return {
          whileTap: buttonAnimations.tap,
          whileHover: {
            scale: 1.02,
            boxShadow: "0 0 20px rgba(147, 51, 234, 0.4)",
            transition: { duration: 0.2 },
          },
          animate: loading ? buttonAnimations.loading : {},
        };
      case 'glow':
        return {
          whileTap: { scale: 0.98 },
          whileHover: {
            scale: 1.02,
            boxShadow: [
              "0 0 20px rgba(147, 51, 234, 0.3)",
              "0 0 40px rgba(147, 51, 234, 0.1)",
              "0 0 20px rgba(147, 51, 234, 0.3)",
            ],
            transition: { 
              duration: 0.3,
              boxShadow: {
                repeat: Infinity,
                repeatType: "reverse" as const,
                duration: 1,
              },
            },
          },
        };
      default: // scale
        return {
          whileTap: buttonAnimations.tap,
          whileHover: buttonAnimations.hover,
          animate: loading ? buttonAnimations.loading : {},
        };
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback) {
      simulateHaptic('light');
    }
    onClick?.(e);
  };

  const LoadingSpinner = () => (
    <motion.div
      className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );

  const IconWrapper = ({ children, position }: { children: ReactNode; position: 'left' | 'right' }) => (
    <motion.span
      className={`inline-flex items-center ${
        position === 'left' ? 'mr-2' : 'ml-2'
      }`}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
    >
      {children}
    </motion.span>
  );

  return (
    <motion.button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...getAnimationVariants()}
      {...motionProps}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {icon && iconPosition === 'left' && !loading && (
        <IconWrapper position="left">{icon}</IconWrapper>
      )}
      
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        {children}
      </motion.span>
      
      {icon && iconPosition === 'right' && !loading && (
        <IconWrapper position="right">{icon}</IconWrapper>
      )}
    </motion.button>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

// Floating Action Button variant
export const AnimatedFAB = ({
  children,
  className = '',
  position = 'bottom-right',
  ...props
}: AnimatedButtonProps & {
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}) => {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'bottom-center': 'fixed bottom-6 left-1/2 transform -translate-x-1/2',
  };

  return (
    <motion.div
      className={positionClasses[position]}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <AnimatedButton
        variant="primary"
        size="lg"
        className={`rounded-full p-4 shadow-2xl ${className}`}
        animationType="glow"
        {...props}
      >
        {children}
      </AnimatedButton>
    </motion.div>
  );
};

// Icon button variant
export const AnimatedIconButton = ({
  children,
  className = '',
  ...props
}: AnimatedButtonProps) => (
  <AnimatedButton
    variant="ghost"
    size="sm"
    className={`p-2 rounded-full hover:bg-gray-100 ${className}`}
    animationType="bounce"
    {...props}
  >
    {children}
  </AnimatedButton>
);

// Toggle button variant
export const AnimatedToggleButton = ({
  isActive,
  activeColor = 'bg-purple-600',
  inactiveColor = 'bg-gray-300',
  ...props
}: AnimatedButtonProps & {
  isActive?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}) => (
  <motion.button
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
      isActive ? activeColor : inactiveColor
    }`}
    animate={{
      backgroundColor: isActive ? activeColor : inactiveColor,
    }}
    whileTap={{ scale: 0.95 }}
    {...props}
  >
    <motion.span
      className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform"
      animate={{
        x: isActive ? 24 : 4,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </motion.button>
);

export default AnimatedButton;