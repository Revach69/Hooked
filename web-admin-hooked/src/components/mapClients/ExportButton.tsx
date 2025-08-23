'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface ExportButtonProps {
  mapClients: MapClient[];
  filteredClients?: MapClient[];
  disabled?: boolean;
}

export function ExportButton({ mapClients, filteredClients, disabled = false }: ExportButtonProps) {
  const exportToCSV = () => {
    const clientsToExport = filteredClients || mapClients;
    
    if (clientsToExport.length === 0) {
      alert('No data to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'businessName',
      'contactName', 
      'email',
      'phone',
      'address',
      'businessType',
      'monthlyFee',
      'subscriptionStatus',
      'subscriptionStartDate',
      'subscriptionEndDate',
      'description',
      'website'
    ];

    // Convert data to CSV format
    const csvData = clientsToExport.map(client => [
      client.businessName || '',
      client.contactName || '',
      client.email || '',
      client.phone || '',
      client.address || '',
      client.businessType || '',
      client.monthlyFee?.toString() || '',
      client.subscriptionStatus || '',
      client.subscriptionStartDate || '',
      client.subscriptionEndDate || '',
      client.description || '',
      client.website || ''
    ]);

    // Add headers as first row
    const allRows = [headers, ...csvData];
    
    // Convert to CSV string
    const csvContent = allRows
      .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `map_clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clientCount = filteredClients?.length || mapClients.length;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      disabled={disabled || clientCount === 0}
      className="flex items-center gap-2"
    >
      <Download className="h-3 w-3" />
      Export CSV ({clientCount})
    </Button>
  );
}