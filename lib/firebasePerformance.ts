import { getPerformance, trace as firebaseTrace } from 'firebase/performance';
import { app } from './firebaseConfig';

// Types for Firebase Performance Web SDK
interface Trace {
  putAttribute: (name: string, value: string) => void;
  putMetric: (name: string, value: number) => void;
  stop: () => void;
}

interface HttpMetric {
  setHttpResponseCode: (code: number) => void;
  setResponsePayloadSize: (size: number) => void;
  stop: () => void;
}

// Firebase Performance configuration
class FirebasePerformance {
  private static instance: FirebasePerformance;
  private isEnabled: boolean = true;
  private performance: any = null;

  constructor() {
    this.initializePerformance();
  }

  private async initializePerformance() {
    try {
      // Initialize Firebase Performance
      this.performance = getPerformance(app);
      
      // Firebase Performance initialized successfully
    } catch (error) {
      console.error('Failed to initialize Firebase Performance:', error);
    }
  }

  // Start a custom trace
  async startTrace(traceName: string): Promise<Trace> {
    try {
      const trace = firebaseTrace(this.performance, traceName);
      // Started performance trace
      return trace;
    } catch (error) {
      console.error(`Failed to start trace ${traceName}:`, error);
      throw error;
    }
  }

  // Start a network request trace
  async startNetworkRequest(url: string, method: string): Promise<HttpMetric> {
    try {
      // For web SDK, we'll use a custom trace for network requests
      const trace = firebaseTrace(this.performance, `network_request_${method}_${url.replace(/[^a-zA-Z0-9]/g, '_')}`);
      // Started network request trace
      return {
        setHttpResponseCode: (code: number) => trace.putAttribute('response_code', code.toString()),
        setResponsePayloadSize: (size: number) => trace.putMetric('response_size', size),
        stop: () => trace.stop()
      };
    } catch (error) {
      console.error(`Failed to start network request trace:`, error);
      throw error;
    }
  }

  // Add custom attributes to a trace
  async addTraceAttribute(trace: Trace, attribute: string, value: string): Promise<void> {
    try {
      trace.putAttribute(attribute, value);
    } catch (error) {
      console.error(`Failed to add trace attribute ${attribute}:`, error);
    }
  }

  // Add custom metrics to a trace
  async addTraceMetric(trace: Trace, metric: string, value: number): Promise<void> {
    try {
      trace.putMetric(metric, value);
    } catch (error) {
      console.error(`Failed to add trace metric ${metric}:`, error);
    }
  }

  // Stop a trace
  async stopTrace(trace: Trace): Promise<void> {
    try {
      trace.stop();
      // Performance trace stopped successfully
    } catch (error) {
      console.error('Failed to stop performance trace:', error);
    }
  }

  // Stop a network request trace
  async stopNetworkRequest(metric: HttpMetric, responseCode?: number, responsePayloadSize?: number): Promise<void> {
    try {
      if (responseCode) {
        metric.setHttpResponseCode(responseCode);
      }
      if (responsePayloadSize) {
        metric.setResponsePayloadSize(responsePayloadSize);
      }
      metric.stop();
      // Network request trace stopped successfully
    } catch (error) {
      console.error('Failed to stop network request trace:', error);
    }
  }

  // Enable/disable performance collection
  async setPerformanceCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      this.isEnabled = enabled;
      // Performance collection status updated
    } catch (error) {
      console.error('Failed to set performance collection enabled:', error);
    }
  }

  // Get performance collection status
  async isPerformanceCollectionEnabled(): Promise<boolean> {
    try {
      return this.isEnabled;
    } catch (error) {
      console.error('Failed to get performance collection status:', error);
      return false;
    }
  }

  // Create a custom trace with automatic cleanup
  async trace<T>(traceName: string, operation: () => Promise<T>): Promise<T> {
    const trace = await this.startTrace(traceName);
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      await this.addTraceMetric(trace, 'duration_ms', duration);
      await this.stopTrace(trace);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.addTraceMetric(trace, 'duration_ms', duration);
      await this.addTraceAttribute(trace, 'error', error instanceof Error ? error.message : 'Unknown error');
      await this.stopTrace(trace);
      throw error;
    }
  }

  // Monitor network requests automatically
  async monitorNetworkRequest<T>(url: string, method: string, request: () => Promise<T>): Promise<T> {
    const metric = await this.startNetworkRequest(url, method);
    
    try {
      const result = await request();
      await this.stopNetworkRequest(metric, 200);
      return result;
    } catch (error) {
      await this.stopNetworkRequest(metric, 500);
      throw error;
    }
  }
}

// Export singleton instance
export const firebasePerformance = new FirebasePerformance();

// Export convenience functions
export const startTrace = (traceName: string) => firebasePerformance.startTrace(traceName);
export const stopTrace = (trace: Trace) => firebasePerformance.stopTrace(trace);
export const trace = <T>(traceName: string, operation: () => Promise<T>) => firebasePerformance.trace(traceName, operation);
export const monitorNetworkRequest = <T>(url: string, method: string, request: () => Promise<T>) => 
  firebasePerformance.monitorNetworkRequest(url, method, request);

export default firebasePerformance; 