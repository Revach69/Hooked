'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, MessageSquare, Clock, Check, X, UserPlus } from 'lucide-react';
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
        date = new Date((timestamp as any).seconds * 1000);
      } else {
        date = new Date(timestamp as any);
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
    <div className={`border rounded-lg p-6 transition-all ${
      submission.status === 'New' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{submission.fullName}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {formatDate(submission.createdAt)}
            </div>
          </div>
        </div>
        <Badge className={`${getStatusColor(submission.status)}`}>
          {submission.status}
        </Badge>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-gray-400" />
          <a 
            href={`mailto:${submission.email}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {submission.email}
          </a>
        </div>
        
        {submission.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <a 
              href={`tel:${submission.phone}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {submission.phone}
            </a>
          </div>
        )}
      </div>

      {/* Message */}
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="text-sm font-medium text-gray-700">Message:</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 ml-6">
          {submission.message}
        </div>
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
      {submission.status === 'New' && (
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button 
            onClick={() => onConvert(submission)}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Convert to Client
          </Button>
          
          <Button 
            onClick={() => onMarkReviewed(submission.id)}
            size="sm"
            variant="outline"
          >
            <Check className="w-4 h-4 mr-1" />
            Mark Reviewed
          </Button>
          
          <Button 
            onClick={() => setShowNotes(true)}
            size="sm"
            variant="outline"
          >
            <X className="w-4 h-4 mr-1" />
            Dismiss
          </Button>
        </div>
      )}

      {/* Notes input for dismissal */}
      {showNotes && submission.status === 'New' && (
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
            >
              Dismiss
            </Button>
            <Button 
              onClick={() => setShowNotes(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviewed/Converted info */}
      {submission.status !== 'New' && submission.reviewedBy && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          {submission.status === 'Converted' && 'Converted to client'}
          {submission.status === 'Reviewed' && 'Marked as reviewed'} 
          {submission.status === 'Dismissed' && 'Dismissed'}
          {' by '}{submission.reviewedBy}
          {submission.reviewedAt && (
            <> on {formatDate(submission.reviewedAt)}</>
          )}
        </div>
      )}
    </div>
  );
}