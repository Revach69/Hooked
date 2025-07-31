import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '../lib/errorHandler';

const ErrorToast = ({ 
  error, 
  onRetry, 
  onDismiss, 
  autoDismiss = true, 
  dismissDelay = 5000,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  React.useEffect(() => {
    if (autoDismiss && dismissDelay > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, dismissDelay);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300); // Allow time for fade out animation
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
      handleDismiss();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const errorMessage = getErrorMessage(error);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 animate-in slide-in-from-right-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-red-800 mb-1">
              Something went wrong
            </h4>
            <p className="text-sm text-red-700 mb-3">
              {errorMessage}
            </p>
            
            <div className="flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </button>
              )}
              
              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorToast; 