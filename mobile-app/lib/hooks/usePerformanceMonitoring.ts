import { useEffect, useRef } from 'react';
import { firebasePerformance, startTrace, stopTrace } from '../firebasePerformance';

// Types for Firebase Performance Web SDK
interface Trace {
  putAttribute: (name: string, value: string) => void;
  putMetric: (name: string, value: number) => void;
  stop: () => void;
}

interface PerformanceOptions {
  screenName?: string;
  enableScreenTracking?: boolean;
  enableUserInteractionTracking?: boolean;
}

export const usePerformanceMonitoring = (options: PerformanceOptions = {}) => {
  const {
    screenName,
    enableScreenTracking = true,
    enableUserInteractionTracking = true
  } = options;

  const screenTraceRef = useRef<Trace | null>(null);
  const interactionTracesRef = useRef<Map<string, Trace>>(new Map());

  // Screen load tracking
  useEffect(() => {
    if (enableScreenTracking && screenName) {
      const trackScreenLoad = async () => {
        try {
          screenTraceRef.current = await startTrace(`screen_load_${screenName}`);
          await firebasePerformance.addTraceAttribute(screenTraceRef.current, 'screen_name', screenName);
          await firebasePerformance.addTraceAttribute(screenTraceRef.current, 'platform', 'mobile');
          
          // Started screen load trace
        } catch (error) {
          console.error('Failed to start screen load trace:', error);
        }
      };

      trackScreenLoad();

      // Stop trace when component unmounts
      return () => {
        if (screenTraceRef.current) {
          stopTrace(screenTraceRef.current);
          // Stopped screen load trace
        }
        
        // Clear all active traces on unmount
        firebasePerformance.clearActiveTraces();
      };
    }
  }, [screenName, enableScreenTracking]);

  // Track user interactions
  const trackUserInteraction = async (interactionName: string) => {
    if (!enableUserInteractionTracking) return;

    try {
      const trace = await startTrace(`user_interaction_${interactionName}`);
      
      // Add default attributes
      await firebasePerformance.addTraceAttribute(trace, 'interaction_name', interactionName);
      await firebasePerformance.addTraceAttribute(trace, 'screen_name', screenName || 'unknown');
      await firebasePerformance.addTraceAttribute(trace, 'platform', 'mobile');
      


      // Store trace for later stopping
      interactionTracesRef.current.set(interactionName, trace);
      
      // Started user interaction trace
    } catch (error) {
      console.error(`Failed to start user interaction trace ${interactionName}:`, error);
    }
  };

  // Stop user interaction trace
  const stopUserInteraction = async (interactionName: string) => {
    const trace = interactionTracesRef.current.get(interactionName);
    if (trace) {
      try {
        await stopTrace(trace);
        interactionTracesRef.current.delete(interactionName);
        // Stopped user interaction trace
      } catch (error) {
        console.error(`Failed to stop user interaction trace ${interactionName}:`, error);
      }
    }
  };

  // Track async operations
  const trackAsyncOperation = async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return firebasePerformance.trace(`async_operation_${operationName}`, async () => {
      return await operation();
    });
  };

  // Track network requests
  const trackNetworkRequest = async <T>(
    url: string,
    method: string,
    request: () => Promise<T>
  ): Promise<T> => {
    return firebasePerformance.monitorNetworkRequest(url, method, request);
  };

  // Track custom metrics
  const trackCustomMetric = async (metricName: string, value: number) => {
    if (screenTraceRef.current) {
      await firebasePerformance.addTraceMetric(screenTraceRef.current, metricName, value);
    }
  };

  // Track custom attributes
  const trackCustomAttribute = async (attributeName: string, value: string) => {
    if (screenTraceRef.current) {
      await firebasePerformance.addTraceAttribute(screenTraceRef.current, attributeName, value);
    }
  };

  return {
    trackUserInteraction,
    stopUserInteraction,
    trackAsyncOperation,
    trackNetworkRequest,
    trackCustomMetric,
    trackCustomAttribute,
  };
};

// Convenience hooks for specific use cases
export const useScreenTracking = (screenName: string) => {
  return usePerformanceMonitoring({ screenName, enableUserInteractionTracking: false });
};

export const useInteractionTracking = (screenName?: string) => {
  return usePerformanceMonitoring({ screenName, enableScreenTracking: false });
}; 