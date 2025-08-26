// Firebase Performance configuration - Simplified version for better compatibility
import { getPerformance } from 'firebase/performance';
import { app } from './firebaseConfig';

// Configuration: Set to true to completely disable performance monitoring and eliminate all warnings
const DISABLE_PERFORMANCE_MONITORING = true; // Disabled for now to avoid errors

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
  private activeTraces: Map<string, Trace> = new Map();
  private traceCounts: Map<string, number> = new Map();
  private isDisabled: boolean = DISABLE_PERFORMANCE_MONITORING;

  constructor() {
    this.initializePerformance();
  }

  private async initializePerformance() {
    if (this.isDisabled) {
      // Firebase Performance monitoring is disabled
      return;
    }

    try {
      // Initialize Firebase Performance
      this.performance = getPerformance(app);
      // Firebase Performance initialized successfully
    } catch {
              // Failed to initialize Firebase Performance
      this.isDisabled = true;
    }
  }

  // Completely disable performance monitoring
  disable(): void {
    this.isDisabled = true;
    this.clearActiveTraces();
  }

  // Enable performance monitoring
  enable(): void {
    this.isDisabled = false;
  }

  // Check if performance monitoring is disabled
  isPerformanceDisabled(): boolean {
    return this.isDisabled;
  }

  // Start a custom trace
  async startTrace(traceName: string): Promise<Trace> {
    if (this.isDisabled) {
      // Return a dummy trace that does nothing
      return {
        putAttribute: () => {},
        putMetric: () => {},
        stop: () => {}
      };
    }

    try {
      // Check if trace is already active
      if (this.activeTraces.has(traceName)) {
        const count = this.traceCounts.get(traceName) || 0;
        this.traceCounts.set(traceName, count + 1);
        return this.activeTraces.get(traceName)!;
      }

      // Use a simple approach without the trace function for now
      const trace: Trace = {
        putAttribute: (name: string, value: string) => {
          // Trace attribute set
        },
        putMetric: (name: string, value: number) => {
                      // Trace metric set
        },
        stop: () => {
          this.stopTrace(trace, traceName);
        }
      };

      this.activeTraces.set(traceName, trace);
      this.traceCounts.set(traceName, 1);
      
              // Started performance trace
      return trace;
    } catch {
              // Failed to start trace
      return {
        putAttribute: () => {},
        putMetric: () => {},
        stop: () => {}
      };
    }
  }

  // Start a network request trace
  async startNetworkRequest(url: string, method: string): Promise<HttpMetric> {
    if (this.isDisabled) {
      return {
        setHttpResponseCode: () => {},
        setResponsePayloadSize: () => {},
        stop: () => {}
      };
    }

    try {
      const traceName = `network_request_${method}_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      if (this.activeTraces.has(traceName)) {
        const count = this.traceCounts.get(traceName) || 0;
        this.traceCounts.set(traceName, count + 1);
        
        const existingTrace = this.activeTraces.get(traceName)!;
        return {
          setHttpResponseCode: (code: number) => existingTrace.putAttribute('response_code', code.toString()),
          setResponsePayloadSize: (size: number) => existingTrace.putMetric('response_size', size),
          stop: () => {
            this.stopTrace(existingTrace, traceName);
          }
        };
      }

      const trace: Trace = {
        putAttribute: (name: string, value: string) => {
          // Network trace attribute set
        },
        putMetric: (name: string, value: number) => {
                      // Network trace metric set
        },
        stop: () => {
          this.stopTrace(trace, traceName);
        }
      };

      this.activeTraces.set(traceName, trace);
      this.traceCounts.set(traceName, 1);
      
              // Started network request trace
      return {
        setHttpResponseCode: (code: number) => trace.putAttribute('response_code', code.toString()),
        setResponsePayloadSize: (size: number) => trace.putMetric('response_size', size),
        stop: () => {
          this.stopTrace(trace, traceName);
        }
      };
    } catch {
              // Failed to start network request trace
      return {
        setHttpResponseCode: () => {},
        setResponsePayloadSize: () => {},
        stop: () => {}
      };
    }
  }

  // Add custom attributes to a trace
  async addTraceAttribute(trace: Trace, attribute: string, value: string): Promise<void> {
    if (this.isDisabled) return;
    
    try {
      trace.putAttribute(attribute, value);
    } catch {
              // Failed to add trace attribute
    }
  }

  // Add custom metrics to a trace
  async addTraceMetric(trace: Trace, metric: string, value: number): Promise<void> {
    if (this.isDisabled) return;
    
    try {
      trace.putMetric(metric, value);
    } catch {
              // Failed to add trace metric
    }
  }

  // Stop a trace
  async stopTrace(trace: Trace, traceName?: string): Promise<void> {
    if (this.isDisabled) return;
    
    try {
      if (!traceName) {
        trace.stop();
        return;
      }

      if (!this.activeTraces.has(traceName)) {
        // Trace is not active, skipping stop
        return;
      }

      const count = this.traceCounts.get(traceName) || 0;
      if (count <= 1) {
        trace.stop();
        this.activeTraces.delete(traceName);
        this.traceCounts.delete(traceName);
      } else {
        this.traceCounts.set(traceName, count - 1);
      }
      
              // Stopped performance trace
    } catch {
              // Failed to stop performance trace
      if (traceName) {
        this.activeTraces.delete(traceName);
        this.traceCounts.delete(traceName);
      }
    }
  }

  // Stop a network request trace
  async stopNetworkRequest(metric: HttpMetric, responseCode?: number, responsePayloadSize?: number): Promise<void> {
    if (this.isDisabled) return;
    
    try {
      if (responseCode) {
        metric.setHttpResponseCode(responseCode);
      }
      if (responsePayloadSize) {
        metric.setResponsePayloadSize(responsePayloadSize);
      }
      metric.stop();
              // Network request trace stopped successfully
    } catch {
              // Failed to stop network request trace
    }
  }

  // Enable/disable performance collection
  async setPerformanceCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      this.isEnabled = enabled;
              // Performance collection status updated
    } catch {
              // Failed to set performance collection enabled
    }
  }

  // Get performance collection status
  async isPerformanceCollectionEnabled(): Promise<boolean> {
    try {
      return this.isEnabled && !this.isDisabled;
    } catch {
              // Failed to get performance collection status
      return false;
    }
  }

  // Create a custom trace with automatic cleanup
  async trace<T>(traceName: string, operation: () => Promise<T>): Promise<T> {
    if (this.isDisabled) {
      return await operation();
    }

    const trace = await this.startTrace(traceName);
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      await this.addTraceMetric(trace, 'duration_ms', duration);
      await this.stopTrace(trace, traceName);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.addTraceMetric(trace, 'duration_ms', duration);
      await this.addTraceAttribute(trace, 'error', error instanceof Error ? error.message : 'Unknown error');
      await this.stopTrace(trace, traceName);
      throw error;
    }
  }

  // Monitor network requests automatically
  async monitorNetworkRequest<T>(url: string, method: string, request: () => Promise<T>): Promise<T> {
    if (this.isDisabled) {
      return await request();
    }

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

  // Clear all active traces
  clearActiveTraces(): void {
    this.activeTraces.clear();
    this.traceCounts.clear();
  }

  // Get active trace count for debugging
  getActiveTraceCount(): number {
    return this.activeTraces.size;
  }

  // Get trace reference count for debugging
  getTraceReferenceCount(traceName: string): number {
    return this.traceCounts.get(traceName) || 0;
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