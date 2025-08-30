'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { MapClientAPI } from '@/lib/firestore/mapClients';
import type { MapClient } from '@/types/admin';

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportRow {
  rowNumber: number;
  data: Partial<MapClient>;
  status: 'pending' | 'valid' | 'invalid' | 'imported' | 'error';
  errors: string[];
}

interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  imported: number;
  failed: number;
}

export function BulkImportModal({ open, onOpenChange, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary>({ total: 0, valid: 0, invalid: 0, imported: 0, failed: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFields = ['businessName', 'contactName', 'address', 'businessType'];
  const optionalFields = ['email', 'phone', 'monthlyFee', 'subscriptionStatus', 'description', 'website'];

  const sampleData = `businessName,contactName,email,phone,address,businessType,monthlyFee,subscriptionStatus,description,website
"Joe's Pizza","John Smith","john@joespizza.com","555-0101","123 Main St, New York, NY 10001","restaurant","299.99","active","Best pizza in town","https://joespizza.com"
"Downtown Bar","Sarah Johnson","sarah@downtownbar.com","555-0102","456 Broadway, New York, NY 10002","bar","199.99","pending","Craft cocktails and live music","https://downtownbar.com"
"Coffee Central","Mike Wilson","mike@coffeecentral.com","555-0103","789 Park Ave, New York, NY 10003","cafe","149.99","active","Artisan coffee and pastries","https://coffeecentral.com"`;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const validateRow = (data: Record<string, unknown>, rowNumber: number): ImportRow => {
    const errors: string[] = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });

    // Validate business type
    if (data.businessType && !['restaurant', 'bar', 'club', 'cafe', 'venue', 'other'].includes(data.businessType)) {
      errors.push('businessType must be one of: restaurant, bar, club, cafe, venue, other');
    }

    // Validate subscription status
    if (data.subscriptionStatus && !['active', 'inactive', 'pending'].includes(data.subscriptionStatus)) {
      errors.push('subscriptionStatus must be one of: active, inactive, pending');
    }

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Validate monthly fee
    if (data.monthlyFee && (isNaN(parseFloat(data.monthlyFee)) || parseFloat(data.monthlyFee) < 0)) {
      errors.push('monthlyFee must be a positive number');
    }

    return {
      rowNumber,
      data: {
        businessName: data.businessName?.toString().trim(),
        contactName: data.contactName?.toString().trim(),
        email: data.email?.toString().trim() || null,
        phone: data.phone?.toString().trim() || null,
        address: data.address?.toString().trim(),
        businessType: data.businessType || 'other',
        monthlyFee: data.monthlyFee ? parseFloat(data.monthlyFee) : null,
        subscriptionStatus: data.subscriptionStatus || 'pending',
        description: data.description?.toString().trim() || null,
        website: data.website?.toString().trim() || null,
      },
      status: errors.length === 0 ? 'valid' : 'invalid',
      errors,
    };
  };

  const parseCSV = (csvText: string): ImportRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const data: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          data[header] = values[index];
        }
      });

      rows.push(validateRow(data, i));
    }

    return rows;
  };

  const handleFileProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      setImportData(rows);
      setSummary({
        total: rows.length,
        valid: rows.filter(r => r.status === 'valid').length,
        invalid: rows.filter(r => r.status === 'invalid').length,
        imported: 0,
        failed: 0,
      });
      setStep('preview');
    } catch (error) {
      console.error('Failed to process file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const validRows = importData.filter(row => row.status === 'valid');
    if (validRows.length === 0) return;

    setStep('importing');
    setImportProgress(0);
    
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await MapClientAPI.create(row.data as Omit<MapClient, 'id' | 'createdAt' | 'updatedAt'>);
        row.status = 'imported';
        imported++;
      } catch (error) {
        console.error(`Failed to import row ${row.rowNumber}:`, error);
        row.status = 'error';
        row.errors.push('Failed to save to database');
        failed++;
      }
      
      setImportProgress(((i + 1) / validRows.length) * 100);
    }

    setSummary(prev => ({ ...prev, imported, failed }));
    setStep('complete');
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setImportData([]);
    setSummary({ total: 0, valid: 0, invalid: 0, imported: 0, failed: 0 });
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map_clients_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'imported': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Map Clients
          </DialogTitle>
          <DialogDescription>
            Import multiple venue locations from CSV/Excel files
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* Template Download */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </CardTitle>
                <CardDescription>
                  Start with our CSV template to ensure proper formatting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={downloadTemplate}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload File</CardTitle>
                <CardDescription>
                  Select your CSV file containing venue data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">CSV File</Label>
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                </div>
                
                {file && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-400">
                      <FileText className="h-4 w-4" />
                      <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFileProcess}
                    disabled={!file || isProcessing}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Process File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Required Fields Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Required Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-2">Required:</div>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                      {requiredFields.map(field => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Optional:</div>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                      {optionalFields.map(field => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Rows</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.valid}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Valid</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.invalid}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Invalid</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.valid}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ready to Import</div>
              </div>
            </div>

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle>Preview Import Data</CardTitle>
                <CardDescription>
                  Review the data before importing. Fix any validation errors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {importData.slice(0, 10).map((row) => (
                      <div key={row.rowNumber} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(row.status)}
                          <div>
                            <div className="font-medium">{row.data.businessName}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {row.data.businessType} • {row.data.address}
                            </div>
                            {row.errors.length > 0 && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {row.errors.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={row.status === 'valid' ? 'default' : 'destructive'}>
                          Row {row.rowNumber}
                        </Badge>
                      </div>
                    ))}
                    {importData.length > 10 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        +{importData.length - 10} more rows...
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleReset}>
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={summary.valid === 0}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Import {summary.valid} Venues
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6 text-center">
            <div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <div className="text-lg font-medium mt-4">Importing Venues...</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processing {summary.valid} venue records
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(importProgress)}% complete
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <div className="text-xl font-semibold">Import Complete!</div>
              <div className="text-gray-600 dark:text-gray-400">
                Successfully processed venue data
              </div>
            </div>

            {/* Final Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Processed</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.imported}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Imported</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summary.invalid}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Invalid</div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import More
              </Button>
              <Button onClick={() => {
                onSuccess();
                onOpenChange(false);
                handleReset();
              }}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}