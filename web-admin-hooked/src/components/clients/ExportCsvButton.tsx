'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { AdminClient } from '@/types/admin';

// Firestore timestamp utility
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  
  try {
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return '';
    }
    
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

interface ExportCsvButtonProps {
  clients: AdminClient[];
  disabled?: boolean;
}

export function ExportCsvButton({ clients, disabled = false }: ExportCsvButtonProps) {
  const convertToCSV = (data: AdminClient[]): string => {
    if (data.length === 0) return '';

    const headers = [
      'Name',
      'Type',
      'Event',
      'Name of POC',
      'Phone',
      'Email',
      'Country',
      '# of Expected Attendees',
      'Date of Event',
      'Event Organizer Form Sent?',
      'Status',
      'Source',
      'Description',
      'Created At',
      'Updated At'
    ];

    const rows = data.map(client => [
      client.name,
      client.type,
      client.eventKind,
      client.pocName,
      client.phone || '',
      client.email || '',
      client.country || '',
      client.expectedAttendees || '',
      client.eventDate || '',
      client.organizerFormSent || '',
      client.status,
      client.source || '',
      client.description || '',
      formatTimestamp(client.createdAt),
      formatTimestamp(client.updatedAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExport = () => {
    const csvContent = convertToCSV(clients);
    if (csvContent) {
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `hooked-clients-${timestamp}.csv`);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || clients.length === 0}
      variant="outline"
      size="sm"
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
