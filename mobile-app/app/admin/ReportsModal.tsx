import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { X, User, Flag, AlertTriangle, XCircle, Ban, ChevronDown, ChevronUp } from 'lucide-react-native';
import { ReportAPI, EventProfileAPI, KickedUserAPI, type Report } from '../../lib/firebaseApi';

interface ReportsModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

interface ReportWithProfiles extends Report {
  reporterProfile?: any;
  reportedProfile?: any;
}

export default function ReportsModal({ visible, onClose, eventId, eventName }: ReportsModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated before accessing reports
      const { AuthAPI } = await import('../../lib/firebaseApi');
      const currentUser = AuthAPI.getCurrentUser();
      
      if (!currentUser) {
        // User is not authenticated, close modal and return
        onClose();
        return;
      }
      
      const eventReports = await ReportAPI.filter({ event_id: eventId });
      
      // Load profiles for each report
      const reportsWithProfiles = await Promise.all(
        eventReports.map(async (report) => {
          const [reporterProfiles, reportedProfiles] = await Promise.all([
            EventProfileAPI.filter({ 
              event_id: eventId, 
              session_id: report.reporter_session_id 
            }),
            EventProfileAPI.filter({ 
              event_id: eventId, 
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
    } catch {
              // Error loading reports
    } finally {
      setIsLoading(false);
    }
  }, [eventId, onClose]);

  useEffect(() => {
    if (visible) {
      loadReports();
    }
  }, [visible, loadReports]);

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
    
    // Check if user is authenticated before performing actions
          const { AuthAPI } = await import('../../lib/firebaseApi');
    const currentUser = AuthAPI.getCurrentUser();
    
    if (!currentUser) {
      // User is not authenticated, close modal and return
      onClose();
      return;
    }
    
    setProcessingReport(pendingAction.report.id);
    setShowAdminNotesDialog(false);
    
    try {
      if (pendingAction.type === 'accept') {
        // Delete the reported user's profile
        if (pendingAction.report.reportedProfile) {
          await EventProfileAPI.delete(pendingAction.report.reportedProfile.id);
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
      
      Alert.alert('Success', 
        pendingAction.type === 'accept' 
          ? `${pendingAction.report.reportedProfile?.first_name} has been removed from the event.`
          : 'Report has been dismissed.'
      );
    } catch {
              // Error processing report
      Alert.alert('Error', 'Failed to process report. Please try again.');
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
      case 'pending': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'dismissed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={[styles.modalContent, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={styles.headerTitleContainer}>
                <Flag size={24} color="#f97316" />
                <View style={styles.headerText}>
                  <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                    Reports for {eventName}
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={[styles.loadingText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  Loading reports...
                </Text>
              </View>
            ) : reports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Flag size={48} color={isDark ? '#4b5563' : '#9ca3af'} />
                <Text style={[styles.emptyTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                  No Reports
                </Text>
                <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  No reports have been submitted for this event.
                </Text>
              </View>
            ) : (
              <View style={styles.reportsContainer}>
                {/* Pending Reports Section */}
                {pendingReports.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.pendingIndicator, { backgroundColor: '#f59e0b' }]} />
                      <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                        Pending Reports ({pendingReports.length})
                      </Text>
                    </View>
                    <View style={styles.reportsList}>
                      {pendingReports.map((report) => (
                        <View
                          key={report.id}
                          style={[styles.reportCard, { 
                            backgroundColor: isDark ? '#374151' : '#f9fafb',
                            borderColor: isDark ? '#4b5563' : '#e5e7eb'
                          }]}
                        >
                          {/* Report Header */}
                          <View style={styles.reportHeader}>
                            <View style={styles.reportStatus}>
                              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </Text>
                              </View>
                              <Text style={[styles.reportDate, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                {formatDate(report.created_at)}
                              </Text>
                            </View>
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.removeButton]}
                                onPress={() => handleAcceptReport(report)}
                                disabled={processingReport === report.id}
                              >
                                {processingReport === report.id ? (
                                  <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <Ban size={16} color="white" />
                                )}
                                <Text style={styles.actionButtonText}>Remove</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.dismissButton]}
                                onPress={() => handleRejectReport(report)}
                                disabled={processingReport === report.id}
                              >
                                {processingReport === report.id ? (
                                  <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <XCircle size={16} color="white" />
                                )}
                                <Text style={styles.actionButtonText}>Dismiss</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Users Section */}
                          <View style={styles.usersSection}>
                            {/* Reporter */}
                            <View style={[styles.userCard, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }]}>
                              <View style={styles.userCardHeader}>
                                <User size={16} color="#2563eb" />
                                <Text style={[styles.userCardTitle, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                                  Reporter
                                </Text>
                              </View>
                              {report.reporterProfile ? (
                                <View style={styles.userInfo}>
                                  <View style={styles.userAvatar}>
                                    {report.reporterProfile.profile_photo_url ? (
                                      <Image
                                        source={{ uri: report.reporterProfile.profile_photo_url }}
                onError={() => {}}
                                        style={styles.avatarImage}
                                      />
                                    ) : (
                                      <View 
                                        style={[styles.avatarFallback, { backgroundColor: report.reporterProfile.profile_color || '#8b5cf6' }]}
                                      >
                                        <Text style={styles.avatarText}>
                                          {report.reporterProfile.first_name[0]}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={styles.userDetails}>
                                    <Text style={[styles.userName, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                      {report.reporterProfile.first_name}
                                    </Text>
                                    <Text style={[styles.userAge, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                      {report.reporterProfile.age} years old
                                    </Text>
                                  </View>
                                </View>
                              ) : (
                                <Text style={[styles.userNotFound, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                  Profile not found
                                </Text>
                              )}
                            </View>

                            {/* Reported User */}
                            <View style={[styles.userCard, { backgroundColor: isDark ? '#7f1d1d' : '#fef2f2' }]}>
                              <View style={styles.userCardHeader}>
                                <AlertTriangle size={16} color="#dc2626" />
                                <Text style={[styles.userCardTitle, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
                                  Reported User
                                </Text>
                              </View>
                              {report.reportedProfile ? (
                                <View style={styles.userInfo}>
                                  <View style={styles.userAvatar}>
                                    {report.reportedProfile.profile_photo_url ? (
                                      <Image
                                        source={{ uri: report.reportedProfile.profile_photo_url }}
                onError={() => {}}
                                        style={styles.avatarImage}
                                      />
                                    ) : (
                                      <View 
                                        style={[styles.avatarFallback, { backgroundColor: report.reportedProfile.profile_color || '#8b5cf6' }]}
                                      >
                                        <Text style={styles.avatarText}>
                                          {report.reportedProfile.first_name[0]}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={styles.userDetails}>
                                    <Text style={[styles.userName, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                      {report.reportedProfile.first_name}
                                    </Text>
                                    <Text style={[styles.userAge, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                      {report.reportedProfile.age} years old
                                    </Text>
                                  </View>
                                </View>
                              ) : (
                                <Text style={[styles.userNotFound, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                  Profile not found
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Report Details */}
                          <View style={[styles.detailsCard, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
                            <Text style={[styles.detailsTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                              Report Details
                            </Text>
                            <View style={styles.detailsContent}>
                              <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                  Reason:
                                </Text>
                                <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                  {report.reason.replace('_', ' ')}
                                </Text>
                              </View>
                              {report.details && (
                                <View style={styles.detailRow}>
                                  <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                    Details:
                                  </Text>
                                  <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                    {report.details}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {/* Old Reports Section */}
                {oldReports.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => setShowOldReports(!showOldReports)}
                    >
                      <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                        Old Reports ({oldReports.length})
                      </Text>
                      {showOldReports ? (
                        <ChevronUp size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                      ) : (
                        <ChevronDown size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                      )}
                    </TouchableOpacity>
                    
                    {showOldReports && (
                      <View style={styles.reportsList}>
                        {oldReports.map((report) => (
                          <View
                            key={report.id}
                            style={[styles.reportCard, { 
                              backgroundColor: isDark ? '#374151' : '#f9fafb',
                              borderColor: isDark ? '#4b5563' : '#e5e7eb'
                            }]}
                          >
                            <View style={styles.reportHeader}>
                              <View style={styles.reportStatus}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                                  <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                                    {report.status === 'resolved' ? 'Approved' : 'Rejected'}
                                  </Text>
                                </View>
                                <Text style={[styles.reportDate, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                  {formatDate(report.created_at)}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={[styles.detailsCard, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
                              <View style={styles.detailsContent}>
                                <View style={styles.detailRow}>
                                  <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                    Reporter:
                                  </Text>
                                  <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                    {report.reporterProfile?.first_name || 'Unknown'}
                                  </Text>
                                </View>
                                <View style={styles.detailRow}>
                                  <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                    Reported:
                                  </Text>
                                  <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                    {report.reportedProfile?.first_name || 'Unknown'}
                                  </Text>
                                </View>
                                <View style={styles.detailRow}>
                                  <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                    Reason:
                                  </Text>
                                  <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                    {report.reason.replace('_', ' ')}
                                  </Text>
                                </View>
                                {report.details && (
                                  <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                      Details:
                                    </Text>
                                    <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                                      {report.details}
                                    </Text>
                                  </View>
                                )}
                                {report.admin_notes && (
                                  <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                      Admin Notes:
                                    </Text>
                                    <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : '#1f2937', fontSize: 12 }]}>
                                      {report.admin_notes}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Admin Notes Dialog */}
      {showAdminNotesDialog && pendingAction && (
        <Modal
          visible={showAdminNotesDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelAction}
        >
          <TouchableOpacity 
            style={styles.dialogOverlay}
            activeOpacity={1}
            onPress={handleCancelAction}
          >
            <TouchableOpacity 
              style={[styles.dialogContent, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.dialogTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                {pendingAction.type === 'accept' ? 'Remove User' : 'Dismiss Report'}
              </Text>
              
              <Text style={[styles.dialogDescription, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {pendingAction.type === 'accept' 
                  ? 'You are about to remove the reported user from this event. Please add any notes about this action.'
                  : 'You are about to dismiss this report. Please add any notes about why it was dismissed.'
                }
              </Text>
              
              <Text style={[styles.inputLabel, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                Admin Notes (Optional)
              </Text>
              <TextInput
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder={pendingAction.type === 'accept' 
                  ? 'e.g., User removed due to inappropriate behavior'
                  : 'e.g., Report dismissed - insufficient evidence'
                }
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                style={[styles.textInput, { 
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  color: isDark ? '#ffffff' : '#1f2937',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={[styles.dialogButton, styles.cancelButton, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
                  onPress={handleCancelAction}
                >
                  <Text style={[styles.dialogButtonText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogButton, pendingAction.type === 'accept' ? styles.removeButton : styles.dismissButton]}
                  onPress={handleConfirmAction}
                  disabled={processingReport === pendingAction.report.id}
                >
                  {processingReport === pendingAction.report.id ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.dialogButtonText}>
                      {pendingAction.type === 'accept' ? 'Remove User' : 'Dismiss Report'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: Math.min(Dimensions.get('window').width * 0.9, 500),
    maxHeight: Dimensions.get('window').height * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  reportsContainer: {
    gap: 24,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  reportsList: {
    gap: 16,
  },
  reportCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reportStatus: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: '#dc2626',
  },
  dismissButton: {
    backgroundColor: '#6b7280',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  usersSection: {
    gap: 12,
    marginBottom: 16,
  },
  userCard: {
    borderRadius: 8,
    padding: 12,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  userCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userAge: {
    fontSize: 14,
    marginTop: 2,
  },
  userNotFound: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  detailsCard: {
    borderRadius: 8,
    padding: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsContent: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContent: {
    width: Math.min(Dimensions.get('window').width * 0.9, 400),
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dialogDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    // Styled in the component
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
}); 