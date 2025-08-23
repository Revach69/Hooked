'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText, MapPin, LogOut } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useContext } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const authContext = useContext(AuthContext);
  const logout = authContext.logout;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const navigation = [
    { name: 'Events', href: '/admin/events', icon: Calendar, color: 'text-gray-600' },
    { name: 'Event Clients', href: '/admin/clients', icon: Users, color: 'text-orange-600' },
    { name: 'Map Clients', href: '/admin/map-clients', icon: MapPin, color: 'text-blue-600' },
    { name: 'Forms', href: '/admin/forms', icon: FileText, color: 'text-gray-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin/events" className="text-xl font-bold text-gray-900 dark:text-white">
                Hooked Admin
              </Link>
              
              <nav className="flex space-x-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${!isActive && item.color ? item.color : ''}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            {isClient && (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
} 