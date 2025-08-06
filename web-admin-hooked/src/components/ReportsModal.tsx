'use client';

import { useState, useEffect } from 'react';
import { ReportAPI, EventProfile, KickedUserAPI, type Report } from '@/lib/firebaseApi';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  User, 
  Flag, 
  AlertTriangle,
  Clock,
  Check,
  Ban,
  ChevronDown
} from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

interface ReportWithProfiles extends Report {
  reporterProfile?: EventProfile;
  reportedProfile?: EventProfile;
}

export default function ReportsModal({ isOpen, onClose, eventId, eventName }: ReportsModalProps) {
  const [reports, setReports] = useState<ReportWithProfiles[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingReport, setProcessingReport] = useState<string | null>(null);
  const [showOldReports, setShowOldReports] = useState(false);
  const [showAdminNotesDialog, setShowAdminNotesDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    type: 'accept' | 'reject';
    report: ReportWithProfiles;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen, eventId]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      console.log('Loading reports for event:', eventId);
      // Filter reports by event_id
      const eventReports = await ReportAPI.filter({ event_id: eventId });
      
      // Load profiles for each report
      const reportsWithProfiles = await Promise.all(
        eventReports.map(async (report) => {
          const [reporterProfiles, reportedProfiles] = await Promise.all([
            EventProfile.filter({ 
              event_id: report.event_id, 
              session_id: report.reporter_session_id 
            }),
            EventProfile.filter({ 
              event_id: report.event_id, 
              session_id: report.reported_session_id 
            })
          ]);

          return {
            ...report,
            reporterProfile: reporterProfiles[0] || null,
            reportedProfile: reportedProfiles[0] || null
          };
        })
      );

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptReport = (report: ReportWithProfiles) => {
    if (!report.reportedProfile) return;
    
    setPendingAction({ type: 'accept', report });
    setAdminNotes('');
    setShowAdminNotesDialog(true);
  };

  const handleRejectReport = (report: ReportWithProfiles) => {
    setPendingAction({ type: 'reject', report });
    setAdminNotes('');
    setShowAdminNotesDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    
    setProcessingReport(pendingAction.report.id);
    setShowAdminNotesDialog(false);
    
    try {
      if (pendingAction.type === 'accept') {
        // Delete the reported user's profile
        if (pendingAction.report.reportedProfile) {
          await EventProfile.delete(pendingAction.report.reportedProfile.id);
        }
        
        // Create kicked user record
        await KickedUserAPI.create({
          event_id: pendingAction.report.event_id,
          session_id: pendingAction.report.reported_session_id,
          event_name: eventName,
          admin_notes: adminNotes || 'User removed from event due to report'
        });
        
        // Update report status to resolved
        await ReportAPI.update(pendingAction.report.id, { 
          status: 'resolved',
          admin_notes: adminNotes || 'User removed from event due to report'
        });
      } else {
        // Update report status to dismissed
        await ReportAPI.update(pendingAction.report.id, { 
          status: 'dismissed',
          admin_notes: adminNotes || 'Report dismissed - false report or insufficient evidence'
        });
      }
      
      // Reload reports
      await loadReports();
    } catch (error) {
      console.error('Error processing report:', error);
    } finally {
      setProcessingReport(null);
      setPendingAction(null);
      setAdminNotes('');
    }
  };

  const handleCancelAction = () => {
    setShowAdminNotesDialog(false);
    setPendingAction(null);
    setAdminNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'dismissed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateValue: any) => {
    let date: Date;
    
    // Handle Firestore Timestamp object (most common case)
    if (dateValue && typeof dateValue === 'object' && dateValue.seconds !== undefined) {
      // Firestore Timestamp with seconds and nanoseconds
      date = new Date(dateValue.seconds * 1000);
    } else if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      // Firestore Timestamp object with toDate method
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      // ISO string
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      // Already a Date object
      date = dateValue;
    } else {
      // Fallback
      console.warn('Unknown date format:', dateValue);
      return 'Unknown Date';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateValue);
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Separate pending and old reports
  const pendingReports = reports.filter(report => report.status === 'pending');
  const oldReports = reports.filter(report => report.status !== 'pending');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-4xl min-w-[600px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Flag className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Reports for {eventName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {reports.length} report{reports.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-8 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Reports
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No reports have been submitted for this event.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Pending Reports Section */}
              {pendingReports.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    Pending Reports ({pendingReports.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingReports.map((report) => (
                      <div
                        key={report.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                      >
                        {/* Report Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          {report.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAcceptReport(report)}
                                disabled={processingReport === report.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md text-sm font-medium transition-colors"
                              >
                                {processingReport === report.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                                Remove User
                              </button>
                              <button
                                onClick={() => handleRejectReport(report)}
                                disabled={processingReport === report.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
                              >
                                {processingReport === report.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Dismiss Report
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Users Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          {/* Reporter */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <User className="w-5 h-5 text-blue-600" />
                              <h4 className="font-medium text-blue-900 dark:text-blue-100">Reporter</h4>
                            </div>
                            {report.reporterProfile ? (
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  {report.reporterProfile.profile_photo_url ? (
                                    <img 
                                      src={report.reporterProfile.profile_photo_url} 
                                      alt={report.reporterProfile.first_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div 
                                      className="w-full h-full flex items-center justify-center text-white font-semibold"
                                      style={{ backgroundColor: report.reporterProfile.profile_color || '#8b5cf6' }}
                                    >
                                      {report.reporterProfile.first_name[0]}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {report.reporterProfile.first_name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {report.reporterProfile.age} years old
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Profile not found
                              </p>
                            )}
                          </div>

                          {/* Reported User */}
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                              <h4 className="font-medium text-red-900 dark:text-red-100">Reported User</h4>
                            </div>
                            {report.reportedProfile ? (
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  {report.reportedProfile.profile_photo_url ? (
                                    <img 
                                      src={report.reportedProfile.profile_photo_url} 
                                      alt={report.reportedProfile.first_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div 
                                      className="w-full h-full flex items-center justify-center text-white font-semibold"
                                      style={{ backgroundColor: report.reportedProfile.profile_color || '#8b5cf6' }}
                                    >
                                      {report.reportedProfile.first_name[0]}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {report.reportedProfile.first_name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {report.reportedProfile.age} years old
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Profile not found
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Report Details */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Report Details</h4>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason: </span>
                              <span className="text-sm text-gray-900 dark:text-white capitalize">
                                {report.reason.replace('_', ' ')}
                              </span>
                            </div>
                            {report.details && (
                              <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Details: </span>
                                <p className="text-sm text-gray-900 dark:text-white mt-1">
                                  {report.details}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Old Reports Section */}
              {oldReports.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <button
                    onClick={() => setShowOldReports(!showOldReports)}
                    className="flex items-center justify-between w-full text-left mb-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Old Reports ({oldReports.length})
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showOldReports ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showOldReports && (
                    <div className="space-y-4">
                      {oldReports.map((report) => (
                        <div
                          key={report.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                {report.status === 'resolved' ? 'Approved' : 'Rejected'}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(report.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="mb-1">
                              <strong>Reporter:</strong> {report.reporterProfile?.first_name || 'Unknown'}
                            </div>
                            <div className="mb-1">
                              <strong>Reported:</strong> {report.reportedProfile?.first_name || 'Unknown'}
                            </div>
                            <div className="mb-1">
                              <strong>Reason:</strong> {report.reason.replace('_', ' ')}
                            </div>
                            {report.details && (
                              <div className="mb-1">
                                <strong>Details:</strong> {report.details}
                              </div>
                            )}
                            {report.admin_notes && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <strong>Admin Notes:</strong> {report.admin_notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Notes Dialog */}
      {showAdminNotesDialog && pendingAction && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {pendingAction.type === 'accept' ? 'Remove User' : 'Dismiss Report'}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {pendingAction.type === 'accept' 
                    ? 'You are about to remove the reported user from this event. Please add any notes about this action.'
                    : 'You are about to dismiss this report. Please add any notes about why it was dismissed.'
                  }
                </p>
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={pendingAction.type === 'accept' 
                    ? 'e.g., User removed due to inappropriate behavior'
                    : 'e.g., Report dismissed - insufficient evidence'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCancelAction}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={processingReport === pendingAction.report.id}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                    pendingAction.type === 'accept'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                      : 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400'
                  }`}
                >
                  {processingReport === pendingAction.report.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    pendingAction.type === 'accept' ? 'Remove User' : 'Dismiss Report'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 