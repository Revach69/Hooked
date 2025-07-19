import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { BarChart3, AlertTriangle, Clock, Activity, Trash2, Download } from 'lucide-react-native';
import { getErrorInsights, errorMonitor } from '../lib/errorMonitoring';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ErrorInsights() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadErrorInsights();
  }, []);

  const loadErrorInsights = async () => {
    try {
      const data = await getErrorInsights();
      setInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    Alert.alert(
      'Clear Error Logs',
      'Are you sure you want to clear all error logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await errorMonitor.clearLogs();
            loadErrorInsights();
          },
        },
      ]
    );
  };

  const exportLogs = async () => {
    try {
      const logs = await errorMonitor.exportLogs();
      // In a real app, you'd share this data or save it
      Alert.alert('Export Complete', `Exported ${logs.length} error logs`);
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export error logs');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#ffffff' : '#1f2937'} />
          <Text style={[styles.loadingText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            Loading error insights...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: isDark ? '#ffffff' : '#1f2937' }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1f2937' }]}>
          Error Insights
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={exportLogs} style={styles.actionButton}>
            <Download size={20} color={isDark ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearLogs} style={styles.actionButton}>
            <Trash2 size={20} color={isDark ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
            <Activity size={24} color="#ef4444" />
            <Text style={[styles.summaryNumber, { color: isDark ? '#ffffff' : '#1f2937' }]}>
              {insights?.stats?.totalErrors || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Total Errors (24h)
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
            <AlertTriangle size={24} color="#f59e0b" />
            <Text style={[styles.summaryNumber, { color: isDark ? '#ffffff' : '#1f2937' }]}>
              {Object.keys(insights?.stats?.errorsByOperation || {}).length}
            </Text>
            <Text style={[styles.summaryLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Operations Affected
            </Text>
          </View>
        </View>

        {/* Most Common Errors */}
        <View style={[styles.section, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
            Most Common Errors
          </Text>
          {insights?.patterns?.mostCommonErrors?.map((error: any, index: number) => (
            <View key={index} style={styles.errorItem}>
              <Text style={[styles.errorCode, { color: isDark ? '#ef4444' : '#dc2626' }]}>
                {error.error}
              </Text>
              <Text style={[styles.errorCount, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {error.count} occurrences
              </Text>
            </View>
          ))}
        </View>

        {/* Operations with Most Errors */}
        <View style={[styles.section, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
            Operations with Most Errors
          </Text>
          {insights?.patterns?.operationsWithMostErrors?.map((op: any, index: number) => (
            <View key={index} style={styles.errorItem}>
              <Text style={[styles.operationName, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                {op.operation}
              </Text>
              <Text style={[styles.errorCount, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {op.count} errors
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Errors */}
        <View style={[styles.section, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
            Recent Errors
          </Text>
          {insights?.stats?.recentErrors?.slice(0, 10).map((error: any, index: number) => (
            <View key={index} style={styles.recentErrorItem}>
              <View style={styles.recentErrorHeader}>
                <Text style={[styles.recentErrorOperation, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                  {error.operation}
                </Text>
                <Text style={[styles.recentErrorTime, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {new Date(error.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={[styles.recentErrorMessage, { color: isDark ? '#ef4444' : '#dc2626' }]}>
                {error.error}
              </Text>
              {error.code && (
                <Text style={[styles.recentErrorCode, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  Code: {error.code}
                </Text>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={loadErrorInsights} style={styles.refreshButton}>
          <Text style={[styles.refreshButtonText, { color: isDark ? '#ffffff' : '#1f2937' }]}>
            Refresh Data
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  errorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  errorCode: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  operationName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  errorCount: {
    fontSize: 14,
  },
  recentErrorItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentErrorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentErrorOperation: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentErrorTime: {
    fontSize: 12,
  },
  recentErrorMessage: {
    fontSize: 13,
    marginBottom: 2,
  },
  recentErrorCode: {
    fontSize: 12,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
}); 