import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { attemptFirebaseRecovery } from './firebaseRecovery';
import { getErrorMessage } from './mobileErrorHandler';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import Toast from 'react-native-toast-message';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (_error: Error, _errorInfo: any) => void;
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
    Sentry.captureException(error, {
      extra: errorInfo,
      tags: {
        component: 'FirebaseErrorBoundary'
      }
    });
    
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
      this.handleFirebaseError();
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

  private async handleFirebaseError() {
    // Check network status
    const netInfo = await NetInfo.fetch();
    this.setState({ networkStatus: netInfo.isConnected ? 'connected' : 'disconnected' });

    if (!netInfo.isConnected) {
      return;
    }

    // Attempt Firebase recovery
    this.setState({ isRecovering: true });
    
    try {
      const recoverySuccess = await attemptFirebaseRecovery();
      
      if (recoverySuccess) {
        this.resetErrorBoundary();
      }
    } catch (recoveryError) {
      Sentry.captureException(recoveryError as Error, {
        tags: {
          component: 'FirebaseErrorBoundary',
          context: 'firebaseRecovery'
        }
      });
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  private async checkNetworkStatus() {
    try {
      const netInfo = await NetInfo.fetch();
      this.setState({ networkStatus: netInfo.isConnected ? 'connected' : 'disconnected' });
    } catch {
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
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Please check your internet connection and try again.',
          position: 'top',
          visibilityTime: 3500,
          autoHide: true,
          topOffset: 0,
        });
        return;
      }

      // Attempt Firebase recovery
      const recoverySuccess = await attemptFirebaseRecovery();
      
      if (recoverySuccess) {
        this.resetErrorBoundary();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Recovery Failed',
          text2: 'Unable to recover from the error. Please try restarting the app.',
          position: 'top',
          visibilityTime: 3500,
          autoHide: true,
          topOffset: 0,
        });
      }
    } catch (error) {
      Sentry.captureException(error as Error, {
        tags: {
          component: 'FirebaseErrorBoundary',
          context: 'manualRetry'
        }
      });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred. Please try again.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  private handleRestart = () => {
    // For restart confirmation, we'll show a persistent error notification with action button
    // In the notification system, we can add an action button in the future
    // For now, we'll just reset the error boundary directly
    Toast.show({
      type: 'info',
      text1: 'Restarting App',
      text2: 'Resetting the app to resolve the issue...',
      position: 'top',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 0,
    });
    
    setTimeout(() => {
      this.resetErrorBoundary();
    }, 2000);
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