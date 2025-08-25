'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FirebaseErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Firebase Error Boundary caught an error:', error, errorInfo);
    
    // Report to error monitoring service if available
    if (process.env.NEXT_PUBLIC_ERROR_REPORTING === 'true') {
      // Could integrate with Sentry here
      console.error('Error reported to monitoring service:', error.message);
    }
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md text-center">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              Connection Error
            </h2>
            <p className="text-gray-600 mb-4">
              Unable to connect to the Hooked servers. Please check your internet connection and try again.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
            {process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Debug Information
                </summary>
                <pre className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FirebaseErrorBoundary;