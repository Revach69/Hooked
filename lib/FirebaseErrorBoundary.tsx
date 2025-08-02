import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { attemptFirebaseRecovery, getFirebaseRecoveryStatus } from './firebaseRecovery';
import { getErrorMessage } from './mobileErrorHandler';
import NetInfo from '@react-native-community/netinfo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isRecovering: boolean;
  networkStatus: 'connected' | 'disconnected' | 'checking';
}

class FirebaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      networkStatus: 'checking'
    };
  }

  componentDidMount() {
    this.checkNetworkStatus();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 Firebase Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Check if this is a Firebase-related error
    if (this.isFirebaseError(error)) {
      this.handleFirebaseError(error);
    }
  }

  private isFirebaseError(error: Error): boolean {
    const firebaseErrorPatterns = [
      'Firebase',
      'Firestore',
      'WebChannelConnection',
      'unavailable',
      'deadline-exceeded',
      'network',
      'timeout',
      'connection'
    ];

    return firebaseErrorPatterns.some(pattern => 
      error.message.includes(pattern) ||
      error.name.includes(pattern)
    );
  }

  private async handleFirebaseError(error: Error) {
    console.log('🔄 Handling Firebase error in error boundary...');
    
    // Check network status
    const netInfo = await NetInfo.fetch();
    this.setState({ networkStatus: netInfo.isConnected ? 'connected' : 'disconnected' });

    if (!netInfo.isConnected) {
      console.log('📴 Network is disconnected, cannot attempt recovery');
      return;
    }

    // Attempt Firebase recovery
    this.setState({ isRecovering: true });
    
    try {
      const recoverySuccess = await attemptFirebaseRecovery('Error Boundary Recovery');
      
      if (recoverySuccess) {
        console.log('✅ Firebase recovery successful, resetting error boundary');
        this.resetErrorBoundary();
      } else {
        console.log('❌ Firebase recovery failed');
      }
    } catch (recoveryError) {
      console.error('❌ Error during Firebase recovery:', recoveryError);
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  private async checkNetworkStatus() {
    try {
      const netInfo = await NetInfo.fetch();
      this.setState({ networkStatus: netInfo.isConnected ? 'connected' : 'disconnected' });
    } catch (error) {
      console.warn('⚠️ Failed to check network status:', error);
      this.setState({ networkStatus: 'disconnected' });
    }
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    });
  };

  private handleRetry = async () => {
    this.setState({ isRecovering: true });
    
    try {
      // Check network status
      await this.checkNetworkStatus();
      
      if (this.state.networkStatus === 'disconnected') {
        Alert.alert(
          'No Internet Connection',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Attempt Firebase recovery
      const recoverySuccess = await attemptFirebaseRecovery('Manual Retry');
      
      if (recoverySuccess) {
        this.resetErrorBoundary();
      } else {
        Alert.alert(
          'Recovery Failed',
          'Unable to recover from the error. Please try restarting the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error during manual retry:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  private handleRestart = () => {
    Alert.alert(
      'Restart App',
      'This will restart the app to resolve the issue. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: () => {
            // In a real app, you might want to use a restart mechanism
            // For now, we'll just reset the error boundary
            this.resetErrorBoundary();
          }
        }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <FirebaseErrorFallback
          error={this.state.error}
          isRecovering={this.state.isRecovering}
          networkStatus={this.state.networkStatus}
          onRetry={this.handleRetry}
          onRestart={this.handleRestart}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error | null;
  isRecovering: boolean;
  networkStatus: 'connected' | 'disconnected' | 'checking';
  onRetry: () => void;
  onRestart: () => void;
}

const FirebaseErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  isRecovering,
  networkStatus,
  onRetry,
  onRestart
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getNetworkIcon = () => {
    switch (networkStatus) {
      case 'connected':
        return <Wifi size={20} color="#10b981" />;
      case 'disconnected':
        return <WifiOff size={20} color="#ef4444" />;
      default:
        return <Wifi size={20} color="#6b7280" />;
    }
  };

  const getNetworkText = () => {
    switch (networkStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'No internet connection';
      default:
        return 'Checking connection...';
    }
  };

  const errorMessage = error ? getErrorMessage(error) : 'An unexpected error occurred';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={48} color="#ef4444" />
        </View>

        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Something went wrong
        </Text>

        <Text style={[styles.message, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          {errorMessage}
        </Text>

        {/* Network Status */}
        <View style={[styles.networkStatus, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}>
          {getNetworkIcon()}
          <Text style={[styles.networkText, { color: isDark ? '#d1d5db' : '#374151' }]}>
            {getNetworkText()}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}
            onPress={onRetry}
            disabled={isRecovering || networkStatus === 'disconnected'}
          >
            {isRecovering ? (
              <RefreshCw size={20} color={isDark ? '#fff' : '#000'} />
            ) : (
              <Text style={[styles.buttonText, { color: isDark ? '#fff' : '#000' }]}>
                Try Again
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.restartButton, { backgroundColor: '#ef4444' }]}
            onPress={onRestart}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              Restart App
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 32,
  },
  networkText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FirebaseErrorBoundary; 