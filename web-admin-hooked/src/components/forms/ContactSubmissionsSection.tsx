'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Search, Filter, Mail, Users } from 'lucide-react';
import { ContactSubmissionCard } from './ContactSubmissionCard';
import { ContactFormSubmissionAPI } from '@/lib/firestore/contactSubmissions';
import { AdminClientAPI } from '@/lib/firestore/clients';
import type { ContactFormSubmission } from '@/types/admin';

interface ContactSubmissionsSectionProps {
  newSubmissionsCount: number;
  onNewSubmissionsCountChange: (count: number) => void;
}

export function ContactSubmissionsSection({ 
  newSubmissionsCount, 
  onNewSubmissionsCountChange 
}: ContactSubmissionsSectionProps) {
  const [submissions, setSubmissions] = useState<ContactFormSubmission[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [convertingSubmission, setConvertingSubmission] = useState<ContactFormSubmission | null>(null);

  // Load submissions when expanded
  useEffect(() => {
    if (isExpanded) {
      loadSubmissions();
    }
  }, [isExpanded]);

  // Load new submissions count on mount
  useEffect(() => {
    loadNewSubmissionsCount();
  }, []);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const allSubmissions = await ContactFormSubmissionAPI.getAll();
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Failed to load contact submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNewSubmissionsCount = async () => {
    try {
      const count = await ContactFormSubmissionAPI.getUnreadCount();
      onNewSubmissionsCountChange(count);
    } catch (error) {
      console.error('Failed to load new submissions count:', error);
    }
  };

  const handleConvert = async (submission: ContactFormSubmission) => {
    setConvertingSubmission(submission);
    try {
      // Create client from contact submission
      const clientData = {
        name: submission.fullName,
        type: 'Other Organization' as const,
        pocName: submission.fullName,
        phone: submission.phone || null,
        email: submission.email,
        country: null, // Will need to be set by admin later
        status: 'Pre-Discussion' as const,
        source: 'Contact Form' as const,
        events: [],
        adminNotes: `Contact form message: ${submission.message}`
      };

      const newClient = await AdminClientAPI.create(clientData);
      
      // Mark submission as converted
      await ContactFormSubmissionAPI.markAsConverted(
        submission.id, 
        newClient.id, 
        'Admin' // TODO: Get actual admin user
      );

      // Refresh submissions and update counts
      await loadSubmissions();
      await loadNewSubmissionsCount();

      alert(`Successfully created client "${newClient.name}" from contact submission!`);
    } catch (error) {
      console.error('Failed to convert submission:', error);
      alert('Failed to convert submission to client. Please try again.');
    } finally {
      setConvertingSubmission(null);
    }
  };

  const handleDismiss = async (submissionId: string, notes?: string) => {
    try {
      await ContactFormSubmissionAPI.markAsDismissed(submissionId, 'Admin'); // TODO: Get actual admin user
      
      if (notes) {
        await ContactFormSubmissionAPI.update(submissionId, { adminNotes: notes });
      }

      // Refresh submissions and update counts
      await loadSubmissions();
      await loadNewSubmissionsCount();
    } catch (error) {
      console.error('Failed to dismiss submission:', error);
      alert('Failed to dismiss submission. Please try again.');
    }
  };

  const handleMarkReviewed = async (submissionId: string) => {
    try {
      await ContactFormSubmissionAPI.markAsReviewed(submissionId, 'Admin'); // TODO: Get actual admin user
      
      // Refresh submissions and update counts
      await loadSubmissions();
      await loadNewSubmissionsCount();
    } catch (error) {
      console.error('Failed to mark submission as reviewed:', error);
      alert('Failed to mark submission as reviewed. Please try again.');
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = !statusFilter || submission.status === statusFilter;
    const matchesSearch = !searchQuery || 
      submission.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getSectionBadgeColor = () => {
    if (newSubmissionsCount === 0) return 'bg-gray-100 text-gray-600';
    return 'bg-red-100 text-red-600 animate-pulse';
  };

  return (
    <div className={`border rounded-lg ${newSubmissionsCount > 0 ? 'border-red-200 bg-red-50/20' : 'border-gray-200'}`}>
      {/* Section Header - Always Visible */}
      <div 
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <Mail className="w-5 h-5 text-purple-600" />
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Contact Form Submissions
            </h3>
            <Badge className={getSectionBadgeColor()}>
              {newSubmissionsCount} new
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {submissions.length > 0 && (
            <span className="text-sm text-gray-500">
              {submissions.length} total
            </span>
          )}
          <Button variant="ghost" size="sm">
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Reviewed">Reviewed</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* Submissions List */}
          {!isLoading && (
            <>
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {submissions.length === 0 
                    ? 'No contact form submissions yet.' 
                    : 'No submissions match your filters.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubmissions.map((submission) => (
                    <ContactSubmissionCard
                      key={submission.id}
                      submission={submission}
                      onConvert={handleConvert}
                      onDismiss={handleDismiss}
                      onMarkReviewed={handleMarkReviewed}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Bulk Actions */}
          {!isLoading && filteredSubmissions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // TODO: Implement bulk mark as reviewed
                    console.log('Bulk mark as reviewed');
                  }}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Mark All New as Reviewed
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}