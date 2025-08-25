'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  QrCodeIcon, 
  UserIcon, 
  HeartIcon, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  UserIcon as UserIconSolid,
  HeartIcon as HeartIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid
} from '@heroicons/react/24/solid';
import { useSession } from '@/lib/sessionManager';
import { detectDevice } from '@/lib/deviceDetection';
import { RouteTransition } from '@/components/PageTransition';
import { navAnimations, simulateHaptic } from '@/lib/animations';

interface MobileLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: typeof HomeIcon;
  activeIcon: typeof HomeIconSolid;
  requiresProfile?: boolean;
}

const navigation: NavItem[] = [
  {
    name: 'Home',
    path: '/',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    name: 'Event',
    path: '/event',
    icon: QrCodeIcon,
    activeIcon: QrCodeIconSolid,
  },
  {
    name: 'Discovery',
    path: '/discovery',
    icon: HeartIcon,
    activeIcon: HeartIconSolid,
    requiresProfile: true,
  },
  {
    name: 'Matches',
    path: '/matches',
    icon: ChatBubbleLeftRightIcon,
    activeIcon: ChatBubbleLeftRightIconSolid,
    requiresProfile: true,
  },
  {
    name: 'Profile',
    path: '/profile',
    icon: UserIcon,
    activeIcon: UserIconSolid,
  },
];

export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();
  const session = useSession();
  const [deviceInfo, setDeviceInfo] = useState(() => detectDevice());

  // Update device info on window resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide navigation on certain pages
  const hideNavigation = pathname?.startsWith('/desktop-not-supported') || 
                        pathname?.startsWith('/firebase-test') ||
                        pathname?.startsWith('/session-test') ||
                        pathname === '/chat';

  const isTabletView = deviceInfo.isTablet;

  return (
    <div className="flex flex-col h-screen-mobile bg-gray-50">
      {/* Status bar spacer for mobile */}
      <div className="safe-area-top bg-white" />
      
      {/* Main content area with route transitions */}
      <main className={`flex-1 overflow-hidden relative ${hideNavigation ? '' : 'pb-16'}`}>
        <RouteTransition>
          {children}
        </RouteTransition>
      </main>

      {/* Bottom navigation with animations */}
      <AnimatePresence>
        {!hideNavigation && (
          <motion.nav
            className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 ${isTabletView ? 'px-8' : ''}`}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.div 
              className={`flex ${isTabletView ? 'max-w-md mx-auto' : ''}`}
              variants={navAnimations.container}
              initial="initial"
              animate="animate"
            >
              {navigation.map((item, index) => {
                const isActive = pathname === item.path;
                const IconComponent = isActive ? item.activeIcon : item.icon;
                const isDisabled = item.requiresProfile && !session.userProfile;

                return (
                  <motion.div
                    key={item.name}
                    className="flex-1"
                    variants={navAnimations.item}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Link
                      href={isDisabled ? '/profile' : item.path}
                      className={`flex flex-col items-center py-2 px-1 transition-colors duration-200 ${
                        isDisabled 
                          ? 'opacity-50' 
                          : isActive
                          ? 'text-purple-600'
                          : 'text-gray-500 hover:text-gray-700 active:text-purple-600'
                      }`}
                      onClick={() => simulateHaptic('light')}
                    >
                      <motion.div 
                        className="relative"
                        animate={isActive ? {
                          scale: [1, 1.2, 1],
                          rotate: [0, -5, 5, 0],
                        } : {}}
                        transition={isActive ? {
                          duration: 0.6,
                          ease: "easeInOut",
                        } : {}}
                      >
                        <IconComponent className="h-6 w-6" />
                        {isDisabled && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [1, 0.7, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        )}
                        
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.div>
                      
                      <motion.span
                        className="text-xs mt-1 font-medium"
                        animate={isActive ? {
                          fontWeight: 600,
                          scale: 1.05,
                        } : {
                          fontWeight: 500,
                          scale: 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.name}
                      </motion.span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
            
            {/* Safe area spacer for mobile */}
            <div className="safe-area-bottom" />
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}