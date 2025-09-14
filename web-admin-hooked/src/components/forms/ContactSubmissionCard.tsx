'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, UserPlus } from 'lucide-react';
import type { ContactFormSubmission } from '@/types/admin';

interface ContactSubmissionCardProps {
  submission: ContactFormSubmission;
  onConvert: (submission: ContactFormSubmission) => void;
  onDismiss: (submissionId: string, notes?: string) => void;
  onMarkReviewed: (submissionId: string) => void;
}

export function ContactSubmissionCard({ 
  submission, 
  onConvert, 
  onDismiss, 
  onMarkReviewed 
}: ContactSubmissionCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Reviewed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Converted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Dismissed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Unknown';
    
    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        // Firestore Timestamp
        date = new Date((timestamp as { seconds: number }).seconds * 1000);
      } else {
        date = new Date(timestamp as string | number | Date);
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleDismiss = () => {
    onDismiss(submission.id, notes.trim() || undefined);
    setShowNotes(false);
    setNotes('');
  };

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      submission.status === 'New' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
    }`}>
      {/* Header with status badge */}
      <div className="flex justify-between items-start mb-3">
        {/* Contact details in a single row */}
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-gray-900">{submission.fullName}</span>
          <span className="text-gray-500">{formatDate(submission.createdAt)}</span>
          <a 
            href={`mailto:${submission.email}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {submission.email}
          </a>
          {submission.phone && (
            <a 
              href={`tel:${submission.phone}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {submission.phone}
            </a>
          )}
        </div>
        <Badge className={`${getStatusColor(submission.status)}`}>
          {submission.status}
        </Badge>
      </div>

      {/* Message - single line that expands as needed */}
      <div className="text-sm text-gray-700 mb-3">
        {submission.message}
      </div>

      {/* Admin Notes (if any) */}
      {submission.adminNotes && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-gray-600">
            {submission.adminNotes}
          </div>
        </div>
      )}

      {/* Actions */}
      {(submission.status === 'New' || submission.status === 'Reviewed') && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Button 
            onClick={() => onConvert(submission)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 h-8 text-xs"
            title="Convert this contact submission into a new client"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Convert to Client
          </Button>
          
          {submission.status === 'New' && (
            <Button 
              onClick={() => onMarkReviewed(submission.id)}
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              title="Mark this submission as reviewed"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark Reviewed
            </Button>
          )}
          
          <Button 
            onClick={() => setShowNotes(true)}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            title="Dismiss this submission with optional notes"
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </Button>
        </div>
      )}

      {/* Notes input for dismissal */}
      {showNotes && (submission.status === 'New' || submission.status === 'Reviewed') && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dismissal reason (optional):
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why are you dismissing this submission?"
            className="mb-3"
            rows={2}
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleDismiss}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              title="Confirm dismissal of this submission"
            >
              Dismiss
            </Button>
            <Button 
              onClick={() => setShowNotes(false)}
              size="sm"
              variant="ghost"
              title="Cancel dismissal"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviewed/Converted info */}
      {submission.status !== 'New' && submission.reviewedBy && (
        <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
          {submission.status === 'Converted' && 'Converted to client'}
          {submission.status === 'Reviewed' && 'Marked as reviewed'} 
          {submission.status === 'Dismissed' && 'Dismissed'}
          {' by '}<span className="font-medium">{submission.reviewedBy}</span>
          {submission.reviewedAt && (
            <> on {formatDate(submission.reviewedAt)}</>
          )}
        </div>
      )}
    </div>
  );
}