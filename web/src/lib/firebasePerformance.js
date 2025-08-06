// Firebase Performance Monitoring and Optimization
import { getListenerStats } from './firebaseApi';

class FirebasePerformanceMonitor {
  constructor() {
    this.metrics = {
      listenerCount: 0,
      memoryUsage: 0,
      networkRequests: 0,
      errors: 0,
      lastUpdate: Date.now()
    };
    
    this.history = [];
    this.maxHistorySize = 100;
    this.isMonitoring = false;
  }

  // Start monitoring
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect metrics every 5 seconds
    
    console.log('📊 Firebase performance monitoring started');
  }

  // Stop monitoring
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('📊 Firebase performance monitoring stopped');
  }

  // Collect current metrics
  collectMetrics() {
    try {
      const stats = getListenerStats();
      const memoryInfo = this.getMemoryInfo();
      
      const currentMetrics = {
        timestamp: Date.now(),
        listenerCount: stats.memoryManager || 0,
        memoryUsage: memoryInfo.usedJSHeapSize,
        memoryLimit: memoryInfo.jsHeapSizeLimit,
        networkRequests: this.metrics.networkRequests,
        errors: this.metrics.errors,
        listenerDetails: stats
      };

      this.metrics = currentMetrics;
      this.addToHistory(currentMetrics);
      
      // Log warnings if thresholds are exceeded
      this.checkThresholds(currentMetrics);
      
    } catch (error) {
      console.error('❌ Error collecting Firebase performance metrics:', error);
    }
  }

  // Get memory information
  getMemoryInfo() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      };
    }
    return {
      usedJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0
    };
  }

  // Add metrics to history
  addToHistory(metrics) {
    this.history.push(metrics);
    
    // Keep only the last N entries
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  // Check for performance issues
  checkThresholds(metrics) {
    const warnings = [];
    
    // Check listener count
    if (metrics.listenerCount > 10) {
      warnings.push(`High listener count: ${metrics.listenerCount} (consider cleanup)`);
    }
    
    // Check memory usage
    if (metrics.memoryUsage > metrics.memoryLimit * 0.8) {
      warnings.push(`High memory usage: ${this.formatBytes(metrics.memoryUsage)}`);
    }
    
    // Log warnings
    if (warnings.length > 0) {
      console.warn('⚠️ Firebase Performance Warnings:', warnings);
    }
  }

  // Format bytes for display
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get performance report
  getReport() {
    const currentMetrics = this.metrics;
    const avgMetrics = this.calculateAverages();
    
    return {
      current: {
        listenerCount: currentMetrics.listenerCount,
        memoryUsage: this.formatBytes(currentMetrics.memoryUsage),
        memoryLimit: this.formatBytes(currentMetrics.memoryLimit),
        memoryPercentage: ((currentMetrics.memoryUsage / currentMetrics.memoryLimit) * 100).toFixed(1) + '%'
      },
      averages: {
        listenerCount: avgMetrics.listenerCount.toFixed(1),
        memoryUsage: this.formatBytes(avgMetrics.memoryUsage),
        networkRequests: avgMetrics.networkRequests.toFixed(1)
      },
      recommendations: this.getRecommendations(currentMetrics, avgMetrics)
    };
  }

  // Calculate average metrics
  calculateAverages() {
    if (this.history.length === 0) return { listenerCount: 0, memoryUsage: 0, networkRequests: 0 };
    
    const sum = this.history.reduce((acc, metrics) => ({
      listenerCount: acc.listenerCount + metrics.listenerCount,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage,
      networkRequests: acc.networkRequests + metrics.networkRequests
    }), { listenerCount: 0, memoryUsage: 0, networkRequests: 0 });
    
    const count = this.history.length;
    return {
      listenerCount: sum.listenerCount / count,
      memoryUsage: sum.memoryUsage / count,
      networkRequests: sum.networkRequests / count
    };
  }

  // Get optimization recommendations
  getRecommendations(currentMetrics, avgMetrics) {
    const recommendations = [];
    
    if (currentMetrics.listenerCount > 5) {
      recommendations.push('Consider implementing listener cleanup on component unmount');
    }
    
    if (currentMetrics.memoryUsage > currentMetrics.memoryLimit * 0.7) {
      recommendations.push('Memory usage is high - consider image optimization and data cleanup');
    }
    
    if (avgMetrics.networkRequests > 10) {
      recommendations.push('High network activity - consider implementing caching strategies');
    }
    
    return recommendations;
  }

  // Track network request
  trackNetworkRequest() {
    this.metrics.networkRequests++;
  }

  // Track error
  trackError() {
    this.metrics.errors++;
  }

  // Export metrics for debugging
  exportMetrics() {
    return {
      current: this.metrics,
      history: this.history,
      report: this.getReport()
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new FirebasePerformanceMonitor();

// Auto-start monitoring disabled for production

export default performanceMonitor;

// Export utility functions
export const trackFirebaseRequest = () => {
  performanceMonitor.trackNetworkRequest();
};

export const trackFirebaseError = () => {
  performanceMonitor.trackError();
};

export const getFirebasePerformanceReport = () => {
  return performanceMonitor.getReport();
};

export const exportFirebaseMetrics = () => {
  return performanceMonitor.exportMetrics();
}; 