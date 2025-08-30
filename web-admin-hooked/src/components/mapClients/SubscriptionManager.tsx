'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  CreditCard,
  FileText,
  Bell
} from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface SubscriptionManagerProps {
  mapClient: MapClient;
  onUpdate: (field: string, value: string | number | Date | null) => void;
  onSubscriptionAction: (action: 'activate' | 'pause' | 'cancel' | 'renew', clientId: string) => void;
  disabled?: boolean;
}

export function SubscriptionManager({ 
  mapClient, 
  onUpdate, 
  onSubscriptionAction,
  disabled = false 
}: SubscriptionManagerProps) {
  const [showBillingDetails, setShowBillingDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        icon: CheckCircle, 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        text: 'Active'
      },
      inactive: { 
        icon: XCircle, 
        className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        text: 'Inactive'
      },
      pending: { 
        icon: Clock, 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        text: 'Pending'
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = () => {
    if (!mapClient.subscriptionEndDate) return null;
    const endDate = new Date(mapClient.subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const handleStatusChange = async (newStatus: 'active' | 'inactive' | 'pending') => {
    setIsProcessing(true);
    try {
      await onSubscriptionAction(newStatus === 'active' ? 'activate' : 
                                newStatus === 'inactive' ? 'cancel' : 'activate', mapClient.id);
      onUpdate('subscriptionStatus', newStatus);
    } catch (error) {
      console.error('Failed to update subscription status:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Status
            </div>
            {getStatusBadge(mapClient.subscriptionStatus)}
          </CardTitle>
          <CardDescription>
            Current subscription status and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Control */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subscriptionStatus">Status</Label>
              <Select 
                value={mapClient.subscriptionStatus} 
                onValueChange={handleStatusChange}
                disabled={disabled || isProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Setup</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="monthlyFee">Monthly Fee</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="monthlyFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={mapClient.monthlyFee || ''}
                  onChange={(e) => onUpdate('monthlyFee', parseFloat(e.target.value) || null)}
                  className="pl-10"
                  placeholder="0.00"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Date Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subscriptionStartDate">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="subscriptionStartDate"
                  type="date"
                  value={mapClient.subscriptionStartDate || ''}
                  onChange={(e) => onUpdate('subscriptionStartDate', e.target.value || null)}
                  className="pl-10"
                  disabled={disabled}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="subscriptionEndDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="subscriptionEndDate"
                  type="date"
                  value={mapClient.subscriptionEndDate || ''}
                  onChange={(e) => onUpdate('subscriptionEndDate', e.target.value || null)}
                  className="pl-10"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Expiration Warning */}
          {(isExpiringSoon || isExpired) && (
            <div className={`p-3 rounded-md flex items-center gap-2 ${
              isExpired 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
            }`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isExpired 
                  ? `Subscription expired ${Math.abs(daysUntilExpiry!)} days ago`
                  : `Subscription expires in ${daysUntilExpiry} days`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Billing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(mapClient.monthlyFee)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Fee</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDate(mapClient.subscriptionStartDate)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDate(mapClient.subscriptionEndDate)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">End Date</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mapClient.subscriptionStatus === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSubscriptionAction('pause', mapClient.id)}
                  disabled={disabled || isProcessing}
                >
                  <Clock className="h-3 w-3 mr-2" />
                  Pause Subscription
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSubscriptionAction('renew', mapClient.id)}
                  disabled={disabled || isProcessing}
                >
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Extend Subscription
                </Button>
              </>
            )}
            
            {mapClient.subscriptionStatus === 'inactive' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSubscriptionAction('activate', mapClient.id)}
                disabled={disabled || isProcessing}
                className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
              >
                <CheckCircle className="h-3 w-3 mr-2" />
                Reactivate Subscription
              </Button>
            )}
            
            {mapClient.subscriptionStatus === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSubscriptionAction('activate', mapClient.id)}
                disabled={disabled || isProcessing}
                className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
              >
                <CheckCircle className="h-3 w-3 mr-2" />
                Activate Subscription
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBillingDetails(!showBillingDetails)}
            >
              <FileText className="h-3 w-3 mr-2" />
              {showBillingDetails ? 'Hide' : 'Show'} Billing Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Billing Information */}
      {showBillingDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
            <CardDescription>
              Detailed billing and payment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Billing Cycle</Label>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Monthly recurring billing
                </div>
              </div>
              <div>
                <Label>Payment Method</Label>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  To be configured with payment processor
                </div>
              </div>
            </div>
            
            <div>
              <Label>Billing Notes</Label>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Integration with payment processor (Stripe/PayPal) pending backend implementation
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="text-sm text-blue-800 dark:text-blue-400">
                <strong>Note:</strong> Full billing integration requires backend payment processing setup.
                This interface provides subscription status management for business operations.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}