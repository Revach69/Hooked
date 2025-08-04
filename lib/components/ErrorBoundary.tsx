import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { logFirebaseError } from '../errorMonitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private appStateSubscription: any = null;
  private maxErrorCount = 3;
  private errorResetTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorCount: 0 };
  }

  componentDidMount() {
    // Listen for app state changes to detect when app becomes active
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorCount } = this.state;
    const newErrorCount = errorCount + 1;

    // Log the error to Firebase
    logFirebaseError(error, {
      component: 'ErrorBoundary',
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      errorCount: newErrorCount,
      errorType: this.getErrorType(error),
    });

    this.setState({
      error,
      errorInfo,
      errorCount: newErrorCount,
    });

    // If too many errors, show critical error
    if (newErrorCount >= this.maxErrorCount) {
      this.showCriticalError();
    } else {
      // Show user-friendly alert with retry option
      this.showRecoveryAlert();
    }

    // Auto-reset after 30 seconds if no user interaction
    if (this.errorResetTimeout) {
      clearTimeout(this.errorResetTimeout);
    }
    this.errorResetTimeout = setTimeout(() => {
      this.resetError();
    }, 30000);
  }

  private getErrorType(error: Error): string {
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    
    if (errorMessage.includes('Hermes') || errorStack.includes('hermes')) {
      return 'HERMES_MEMORY_ERROR';
    }
    if (errorMessage.includes('Firebase') || errorStack.includes('firebase')) {
      return 'FIREBASE_ERROR';
    }
    if (errorMessage.includes('AsyncStorage') || errorStack.includes('async-storage')) {
      return 'STORAGE_ERROR';
    }
    if (errorMessage.includes('Network') || errorStack.includes('network')) {
      return 'NETWORK_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  private handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active' && this.state.hasError) {
      // App became active, try to reset error state
      setTimeout(() => {
        this.resetError();
      }, 1000);
    }
  };

  private showRecoveryAlert = () => {
    Alert.alert(
      'App Error',
      'Something went wrong. Would you like to try again?',
      [
        {
          text: 'Try Again',
          onPress: () => this.resetError(),
        },
        {
          text: 'Restart App',
          onPress: () => this.forceRestart(),
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ]
    );
  };

  private showCriticalError = () => {
    Alert.alert(
      'Critical Error',
      'The app has encountered multiple errors. Please restart the app.',
      [
        {
          text: 'Restart App',
          onPress: () => this.forceRestart(),
        },
      ]
    );
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  private forceRestart = () => {
    // Force a complete app restart by clearing state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0,
    });
    
    // Clear any timeouts
    if (this.errorResetTimeout) {
      clearTimeout(this.errorResetTimeout);
      this.errorResetTimeout = null;
    }
  };

  componentWillUnmount() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.errorResetTimeout) {
      clearTimeout(this.errorResetTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={this.resetError}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.restartButton]} onPress={this.forceRestart}>
              <Text style={styles.buttonText}>Restart App</Text>
            </TouchableOpacity>
          </View>
          {this.state.errorCount > 1 && (
            <Text style={styles.errorCount}>
              Error #{this.state.errorCount} of {this.maxErrorCount}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  restartButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorCount: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default ErrorBoundary; 