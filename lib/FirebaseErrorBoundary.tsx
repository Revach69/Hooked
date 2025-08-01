import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react-native';
import { firebaseRecovery } from './firebaseRecovery';
import { ErrorAnalytics } from './errorMonitoring';
import NetInfo from '@react-native-community/netinfo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
  networkStatus: 'connected' | 'disconnected' | 'checking';
}

export class FirebaseErrorBoundary extends Component<Props, State> {
  private errorCount = 0;
  private readonly maxErrorCount = 5; // Limit error catching to prevent infinite loops
  private lastErrorTime = 0;
  private readonly errorCooldown = 5000; // 5 seconds cooldown between error catches

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
      networkStatus: 'checking',
    };
  }

  componentDidMount() {
    this.checkNetworkStatus();
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Prevent recursive error catching
    const now = Date.now();
    if (now - this.lastErrorTime < this.errorCooldown) {
      // Too soon since last error, don't catch this one
      return;
    }

    // Check if we've caught too many errors
    if (this.errorCount >= this.maxErrorCount) {
      console.warn('⚠️ Max error count reached in FirebaseErrorBoundary, not catching more errors');
      return;
    }

    // Check if this is a Firebase-related error
    if (this.isFirebaseError(error)) {
      this.errorCount++;
      this.lastErrorTime = now;
      
      console.error('🚨 Firebase error caught by boundary:', error);
      
      // Record the error
      ErrorAnalytics.recordError(error, 'error_boundary');
      
      this.setState({
        hasError: true,
        error,
      });

      // Call the onError prop if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
    } else {
      // Re-throw non-Firebase errors
      throw error;
    }
  }

  private isFirebaseError(error: Error): boolean {
    return (
      error.message.includes('Firebase') ||
      error.message.includes('firebase') ||
      error.message.includes('INTERNAL ASSERTION FAILED') ||
      error.message.includes('permission-denied') ||
      error.message.includes('unavailable') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection')
    );
  }

  private async checkNetworkStatus() {
    try {
      const netInfo = await NetInfo.fetch();
      this.setState({
        networkStatus: netInfo.isConnected ? 'connected' : 'disconnected',
      });
    } catch (error) {
      this.setState({ networkStatus: 'disconnected' });
    }
  }

  private async handleRetry() {
    this.setState({ isRecovering: true });

    try {
      // Check network status first
      await this.checkNetworkStatus();

      if (this.state.networkStatus === 'disconnected') {
        Alert.alert(
          'No Internet Connection',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        this.setState({ isRecovering: false });
        return;
      }

      // Attempt Firebase recovery
      if (this.state.error) {
        const success = await firebaseRecovery.handleFirebaseError(
          this.state.error,
          'error_boundary_retry'
        );

        if (success) {
          // Reset error count on successful recovery
          this.errorCount = 0;
          this.setState({
            hasError: false,
            error: null,
            isRecovering: false,
          });
        } else {
          console.warn('⚠️ Firebase error recovery failed in boundary');
          Alert.alert(
            'Recovery Failed',
            'Unable to recover from this error. Please try restarting the app.',
            [{ text: 'OK' }]
          );
          this.setState({ isRecovering: false });
        }
      }
    } catch (error) {
      console.error('❌ Error during retry:', error);
      this.setState({ isRecovering: false });
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  private getErrorMessage(): string {
    if (!this.state.error) return 'An unknown error occurred';

    const error = this.state.error;

    // Network-related errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'Network connection issue. Please check your internet connection.';
    }

    // Permission errors
    if (error.message.includes('permission-denied')) {
      return 'Access denied. Please check your permissions.';
    }

    // Service unavailable
    if (error.message.includes('unavailable')) {
      return 'Service temporarily unavailable. Please try again later.';
    }

    // Internal assertion errors
    if (error.message.includes('INTERNAL ASSERTION FAILED')) {
      return 'Internal error detected. Please try again or restart the app.';
    }

    // Generic Firebase errors
    if (error.message.includes('Firebase') || error.message.includes('firebase')) {
      return 'Connection issue with our servers. Please try again.';
    }

    return 'Something went wrong. Please try again.';
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <FirebaseErrorFallback
        error={this.state.error}
        message={this.getErrorMessage()}
        networkStatus={this.state.networkStatus}
        isRecovering={this.state.isRecovering}
        onRetry={this.handleRetry.bind(this)}
        onCheckNetwork={this.checkNetworkStatus.bind(this)}
      />;
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error | null;
  message: string;
  networkStatus: 'connected' | 'disconnected' | 'checking';
  isRecovering: boolean;
  onRetry: () => void;
  onCheckNetwork: () => void;
}

function FirebaseErrorFallback({
  error,
  message,
  networkStatus,
  isRecovering,
  onRetry,
  onCheckNetwork,
}: FallbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]}>
      <View style={[styles.card, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
        <AlertTriangle 
          size={48} 
          color={isDark ? '#ef4444' : '#dc2626'} 
          style={styles.icon}
        />
        
        <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1f2937' }]}>
          Connection Error
        </Text>
        
        <Text style={[styles.message, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
          {message}
        </Text>

        {/* Network Status */}
        <View style={styles.networkStatus}>
          {networkStatus === 'connected' ? (
            <Wifi size={20} color={isDark ? '#10b981' : '#059669'} />
          ) : networkStatus === 'disconnected' ? (
            <WifiOff size={20} color={isDark ? '#ef4444' : '#dc2626'} />
          ) : (
            <View style={[styles.loadingDot, { backgroundColor: isDark ? '#6b7280' : '#9ca3af' }]} />
          )}
          <Text style={[styles.networkText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            {networkStatus === 'connected' ? 'Connected' : 
             networkStatus === 'disconnected' ? 'No Internet' : 'Checking...'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: isDark ? '#3b82f6' : '#2563eb' }]}
            onPress={onRetry}
            disabled={isRecovering}
          >
            {isRecovering ? (
              <View style={styles.loadingContainer}>
                <RefreshCw size={16} color="white" style={styles.spinning} />
                <Text style={styles.buttonText}>Recovering...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Try Again</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: isDark ? '#6b7280' : '#d1d5db' }]}
            onPress={onCheckNetwork}
          >
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Check Network
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Details (only in development) */}
        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text style={[styles.errorTitle, { color: isDark ? '#ef4444' : '#dc2626' }]}>
              Error Details (Dev Only):
            </Text>
            <Text style={[styles.errorText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              {error.message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  networkText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 48,
  },
  secondaryButton: {
    borderWidth: 1,
    minHeight: 48,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  errorDetails: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default FirebaseErrorBoundary; 