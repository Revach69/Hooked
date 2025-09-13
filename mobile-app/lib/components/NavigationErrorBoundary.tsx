import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, Home, RefreshCw } from 'lucide-react-native';
import { unifiedNavigator } from '../navigation/UnifiedNavigator';

interface Props {
  children: ReactNode;
  fallbackPage?: 'home' | 'discovery' | 'matches';
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * NavigationErrorBoundary - Catches navigation-related errors and provides fallback UI
 * 
 * Features:
 * - Catches navigation state errors
 * - Provides recovery options (retry, go home)
 * - Logs errors for debugging
 * - Maintains app stability during navigation failures
 */
export class NavigationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NavigationErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Log navigation-specific error details
    const navigationState = unifiedNavigator.getState();
    console.error('Navigation state at error:', {
      currentPage: navigationState.currentPage,
      params: navigationState.params,
      historyLength: navigationState.history.length,
      error: error.message,
      stack: error.stack
    });

    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoToFallback = () => {
    const fallbackPage = this.props.fallbackPage || 'home';
    
    try {
      // Clear error state and navigate to fallback
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
      
      unifiedNavigator.navigate(fallbackPage, {}, true); // replace: true
    } catch (navError) {
      console.error('NavigationErrorBoundary: Failed to navigate to fallback:', navError);
      // If navigation fails, just reset the error state and hope for the best
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <AlertCircle size={48} color="#ef4444" style={styles.icon} />
            
            <Text style={styles.title}>Navigation Error</Text>
            
            <Text style={styles.message}>
              Something went wrong with the app navigation. This is usually temporary.
            </Text>
            
            {__DEV__ && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={this.handleRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                accessibilityHint="Try to continue where you left off"
              >
                <RefreshCw size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={this.handleGoToFallback}
                accessibilityRole="button"
                accessibilityLabel="Go to home"
                accessibilityHint="Navigate to a safe page"
              >
                <Home size={20} color="#ffffff" />
                <Text style={styles.buttonText}>
                  Go to {this.props.fallbackPage || 'Home'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  debugInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
  },
  homeButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NavigationErrorBoundary;