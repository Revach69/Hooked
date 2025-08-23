'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface SubscriptionDashboardProps {
  mapClients: MapClient[];
  onClientAction?: (action: string, clientId: string) => void;
}

interface SubscriptionMetrics {
  totalActiveSubscriptions: number;
  totalInactiveSubscriptions: number;
  totalPendingSubscriptions: number;
  totalMonthlyRevenue: number;
  averageMonthlyFee: number;
  expiringSoon: MapClient[];
  recentlyExpired: MapClient[];
  newThisMonth: MapClient[];
}

export function SubscriptionDashboard({ mapClients, onClientAction }: SubscriptionDashboardProps) {
  const metrics = useMemo<SubscriptionMetrics>(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeClients = mapClients.filter(c => c.subscriptionStatus === 'active');
    const inactiveClients = mapClients.filter(c => c.subscriptionStatus === 'inactive');
    const pendingClients = mapClients.filter(c => c.subscriptionStatus === 'pending');

    const totalMonthlyRevenue = activeClients.reduce((sum, client) => 
      sum + (client.monthlyFee || 0), 0);

    const expiringSoon = mapClients.filter(client => {
      if (!client.subscriptionEndDate) return false;
      const endDate = new Date(client.subscriptionEndDate);
      return endDate >= now && endDate <= thirtyDaysFromNow && client.subscriptionStatus === 'active';
    });

    const recentlyExpired = mapClients.filter(client => {
      if (!client.subscriptionEndDate) return false;
      const endDate = new Date(client.subscriptionEndDate);
      return endDate < now && endDate >= thirtyDaysAgo;
    });

    const newThisMonth = mapClients.filter(client => {
      if (!client.subscriptionStartDate) return false;
      const startDate = new Date(client.subscriptionStartDate);
      return startDate >= thirtyDaysAgo;
    });

    return {
      totalActiveSubscriptions: activeClients.length,
      totalInactiveSubscriptions: inactiveClients.length,
      totalPendingSubscriptions: pendingClients.length,
      totalMonthlyRevenue,
      averageMonthlyFee: activeClients.length > 0 ? totalMonthlyRevenue / activeClients.length : 0,
      expiringSoon,
      recentlyExpired,
      newThisMonth,
    };
  }, [mapClients]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActiveSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Generating revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalMonthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPendingSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Need activation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly Fee</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageMonthlyFee)}</div>
            <p className="text-xs text-muted-foreground">
              Per active client
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Expiring Soon
            </CardTitle>
            <CardDescription>
              Subscriptions expiring within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.expiringSoon.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No subscriptions expiring soon
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.expiringSoon.slice(0, 5).map(client => {
                  const daysUntilExpiry = Math.ceil(
                    (new Date(client.subscriptionEndDate!).getTime() - new Date().getTime()) / 
                    (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{client.businessName}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Expires in {daysUntilExpiry} days ({formatDate(client.subscriptionEndDate!)})
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(client.monthlyFee || 0)}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onClientAction?.('renew', client.id)}
                        >
                          Renew
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {metrics.expiringSoon.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{metrics.expiringSoon.length - 5} more expiring soon
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Expired */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-red-600" />
              Recently Expired
            </CardTitle>
            <CardDescription>
              Subscriptions that expired in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recentlyExpired.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No recent expirations
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentlyExpired.slice(0, 5).map(client => {
                  const daysExpired = Math.ceil(
                    (new Date().getTime() - new Date(client.subscriptionEndDate!).getTime()) / 
                    (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{client.businessName}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Expired {daysExpired} days ago ({formatDate(client.subscriptionEndDate!)})
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(client.monthlyFee || 0)}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onClientAction?.('reactivate', client.id)}
                        >
                          Reactivate
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {metrics.recentlyExpired.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{metrics.recentlyExpired.length - 5} more recently expired
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-green-600" />
            New This Month
          </CardTitle>
          <CardDescription>
            Subscriptions added in the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.newThisMonth.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No new subscriptions this month
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.newThisMonth.map(client => (
                <div key={client.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="font-medium text-sm">{client.businessName}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Started {formatDate(client.subscriptionStartDate!)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {client.subscriptionStatus}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(client.monthlyFee || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}