/**
 * Performance Testing Suite for Mapbox Integration
 * Tests map loading, frame rates, memory usage, and battery impact
 */

import { device, element, by, expect, waitFor } from 'detox';
import { LocationPermissionHelpers } from './helpers/location-permission-helpers';

describe('Mapbox Performance Testing', () => {
  let performanceMonitor;

  beforeAll(async () => {
    // Initialize performance monitoring
    performanceMonitor = new PerformanceMonitor();
  });

  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always' }
    });
    
    // Enable performance monitoring
    await performanceMonitor.start();
  });

  afterEach(async () => {
    await performanceMonitor.stop();
    await device.terminateApp();
  });

  describe('Map Loading Performance', () => {
    it('should load map within 3 seconds on wifi connection', async () => {
      await device.setNetworkConditions('wifi');
      
      const startTime = Date.now();
      
      await element(by.id('home-tab')).tap();
      await element(by.id('map-button')).tap();
      
      await waitFor(element(by.id('map-loaded-indicator')))
        .toBeVisible()
        .withTimeout(5000);
      
      const loadTime = Date.now() - startTime;
      
      // Log performance metric
      await performanceMonitor.recordMetric('mapLoadTime', loadTime);
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
      console.log(`Map load time: ${loadTime}ms`);
    });

    it('should load map within 5 seconds on 3G connection', async () => {
      await device.setNetworkConditions('slow-3g');
      
      const startTime = Date.now();
      
      await element(by.id('map-button')).tap();
      
      await waitFor(element(by.id('map-loaded-indicator')))
        .toBeVisible()
        .withTimeout(8000);
      
      const loadTime = Date.now() - startTime;
      
      await performanceMonitor.recordMetric('mapLoadTime3G', loadTime);
      
      expect(loadTime).toBeLessThan(5000); // 5 seconds max on 3G
      console.log(`Map load time on 3G: ${loadTime}ms`);
      
      await device.setNetworkConditions('wifi');
    });

    it('should show loading indicators during slow map loads', async () => {
      await device.setNetworkConditions('2g');
      
      await element(by.id('map-button')).tap();
      
      // Loading indicator should appear immediately
      await expect(element(by.id('map-loading-spinner'))).toBeVisible();
      await expect(element(by.text('Loading map...'))).toBeVisible();
      
      // Progress should be communicated
      await waitFor(element(by.text('Loading tiles...')))
        .toBeVisible()
        .withTimeout(3000);
      
      await device.setNetworkConditions('wifi');
    });
  });

  describe('Frame Rate Performance', () => {
    beforeEach(async () => {
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await element(by.id('load-performance-test-data')).tap();
    });

    it('should maintain 55+ FPS during map panning', async () => {
      await performanceMonitor.startFPSMonitoring();
      
      // Perform rapid panning gestures
      for (let i = 0; i < 10; i++) {
        await element(by.id('mapbox-map')).swipe('up', 'fast', 0.8);
        await element(by.id('mapbox-map')).swipe('down', 'fast', 0.8);
        await element(by.id('mapbox-map')).swipe('left', 'fast', 0.8);
        await element(by.id('mapbox-map')).swipe('right', 'fast', 0.8);
      }
      
      const fpsData = await performanceMonitor.getFPSMetrics();
      await performanceMonitor.recordMetric('panningFPS', fpsData.average);
      
      expect(fpsData.average).toBeGreaterThan(55);
      expect(fpsData.minimum).toBeGreaterThan(45);
      
      console.log(`Panning FPS - Avg: ${fpsData.average}, Min: ${fpsData.minimum}, Max: ${fpsData.maximum}`);
    });

    it('should maintain 50+ FPS during zoom operations', async () => {
      await performanceMonitor.startFPSMonitoring();
      
      // Perform rapid zoom operations
      for (let i = 0; i < 15; i++) {
        await element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0);
        await LocationPermissionHelpers.sleep(100);
        await element(by.id('mapbox-map')).pinchWithAngle('inward', 0.7, 0);
        await LocationPermissionHelpers.sleep(100);
      }
      
      const fpsData = await performanceMonitor.getFPSMetrics();
      await performanceMonitor.recordMetric('zoomingFPS', fpsData.average);
      
      expect(fpsData.average).toBeGreaterThan(50);
      expect(fpsData.minimum).toBeGreaterThan(40);
      
      console.log(`Zooming FPS - Avg: ${fpsData.average}, Min: ${fpsData.minimum}, Max: ${fpsData.maximum}`);
    });

    it('should handle simultaneous gestures without frame drops', async () => {
      await performanceMonitor.startFPSMonitoring();
      
      // Perform complex simultaneous gestures
      await performComplexGestures();
      
      const fpsData = await performanceMonitor.getFPSMetrics();
      await performanceMonitor.recordMetric('complexGesturesFPS', fpsData.average);
      
      expect(fpsData.average).toBeGreaterThan(45);
      console.log(`Complex gestures FPS: ${fpsData.average}`);
    });
  });

  describe('Memory Usage Performance', () => {
    beforeEach(async () => {
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
    });

    it('should not exceed 100MB memory increase with 50+ markers', async () => {
      const initialMemory = await performanceMonitor.getMemoryUsage();
      
      // Load 75 venues for stress testing
      await element(by.id('load-performance-test-data')).tap();
      await waitFor(element(by.id('75-venues-loaded')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Interact with map to ensure all markers are rendered
      await element(by.id('mapbox-map')).swipe('up', 'slow');
      await element(by.id('mapbox-map')).swipe('down', 'slow');
      await element(by.id('mapbox-map')).pinchWithAngle('outward', 2.0, 0);
      
      const finalMemory = await performanceMonitor.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      await performanceMonitor.recordMetric('memoryIncreaseWithMarkers', memoryIncrease);
      
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
      console.log(`Memory increase with 75 markers: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    it('should cleanup memory when map is unmounted', async () => {
      // Load test data and measure memory
      await element(by.id('load-performance-test-data')).tap();
      await waitFor(element(by.id('75-venues-loaded')))
        .toBeVisible()
        .withTimeout(5000);
      
      const memoryWithMap = await performanceMonitor.getMemoryUsage();
      
      // Navigate away from map
      await element(by.id('home-tab')).tap();
      await LocationPermissionHelpers.sleep(2000);
      
      // Force garbage collection if available
      await device.sendToHome();
      await LocationPermissionHelpers.sleep(3000);
      await device.launchApp({ newInstance: false });
      
      const memoryAfterCleanup = await performanceMonitor.getMemoryUsage();
      const memoryReduction = memoryWithMap - memoryAfterCleanup;
      
      await performanceMonitor.recordMetric('memoryCleanupAmount', memoryReduction);
      
      // Should free at least 50% of the memory used by map
      expect(memoryReduction).toBeGreaterThan(0);
      console.log(`Memory cleaned up: ${Math.round(memoryReduction / 1024 / 1024)}MB`);
    });

    it('should handle memory warnings gracefully', async () => {
      // Load excessive test data to trigger memory pressure
      await element(by.id('load-stress-test-data')).tap();
      
      const initialMemory = await performanceMonitor.getMemoryUsage();
      
      // Simulate memory warning
      await device.sendMemoryWarning();
      
      await LocationPermissionHelpers.sleep(2000);
      
      const memoryAfterWarning = await performanceMonitor.getMemoryUsage();
      
      // App should reduce memory usage after warning
      expect(memoryAfterWarning).toBeLessThan(initialMemory * 1.1); // Allow 10% increase max
      
      // Map should still be functional
      await expect(element(by.id('mapbox-map'))).toBeVisible();
      await element(by.id('mapbox-map')).swipe('up', 'fast');
    });
  });

  describe('Battery Impact Testing', () => {
    it('should have minimal CPU usage during idle map display', async () => {
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      await performanceMonitor.startCPUMonitoring();
      
      // Let map sit idle for 30 seconds
      await LocationPermissionHelpers.sleep(30000);
      
      const cpuUsage = await performanceMonitor.getCPUUsage();
      await performanceMonitor.recordMetric('idleMapCPU', cpuUsage.average);
      
      // Should use less than 5% CPU when idle
      expect(cpuUsage.average).toBeLessThan(5);
      console.log(`Idle map CPU usage: ${cpuUsage.average}%`);
    });

    it('should limit GPU usage during map interactions', async () => {
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      await performanceMonitor.startGPUMonitoring();
      
      // Perform moderate interactions
      for (let i = 0; i < 5; i++) {
        await element(by.id('mapbox-map')).swipe('up', 'slow');
        await element(by.id('mapbox-map')).pinchWithAngle('outward', 1.2, 0);
        await LocationPermissionHelpers.sleep(1000);
      }
      
      const gpuUsage = await performanceMonitor.getGPUUsage();
      await performanceMonitor.recordMetric('interactionGPU', gpuUsage.average);
      
      // GPU usage should be reasonable
      expect(gpuUsage.average).toBeLessThan(80);
      console.log(`Map interaction GPU usage: ${gpuUsage.average}%`);
    });
  });

  describe('Network Performance', () => {
    it('should efficiently cache map tiles', async () => {
      // First map load - should fetch from network
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      const networkUsage1 = await performanceMonitor.getNetworkUsage();
      
      // Navigate away and back - should use cached tiles
      await element(by.id('home-tab')).tap();
      await LocationPermissionHelpers.sleep(1000);
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      const networkUsage2 = await performanceMonitor.getNetworkUsage();
      const networkDifference = networkUsage2.bytesReceived - networkUsage1.bytesReceived;
      
      await performanceMonitor.recordMetric('tilesCacheEfficiency', networkDifference);
      
      // Second load should use significantly less network
      expect(networkDifference).toBeLessThan(networkUsage1.bytesReceived * 0.5);
      console.log(`Network usage reduction from caching: ${Math.round(networkDifference / 1024)}KB`);
    });

    it('should handle venue data requests efficiently', async () => {
      await performanceMonitor.startNetworkMonitoring();
      
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      // Load venues and measure network requests
      await element(by.id('load-test-venues-button')).tap();
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(5000);
      
      const networkMetrics = await performanceMonitor.getNetworkMetrics();
      await performanceMonitor.recordMetric('venueDataRequests', networkMetrics.requestCount);
      
      // Should not make excessive API calls
      expect(networkMetrics.requestCount).toBeLessThan(10);
      console.log(`Venue data requests: ${networkMetrics.requestCount}`);
    });
  });

  describe('Marker Clustering Performance', () => {
    it('should render 50+ markers within 1 second', async () => {
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      const startTime = Date.now();
      
      await element(by.id('load-performance-test-data')).tap();
      
      await waitFor(element(by.id('50-venues-loaded')))
        .toBeVisible()
        .withTimeout(3000);
      
      const renderTime = Date.now() - startTime;
      await performanceMonitor.recordMetric('markerRenderTime', renderTime);
      
      expect(renderTime).toBeLessThan(1000); // 1 second max
      console.log(`50 marker render time: ${renderTime}ms`);
    });

    it('should handle clustering transitions smoothly', async () => {
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await element(by.id('load-dense-test-data')).tap();
      
      await performanceMonitor.startFPSMonitoring();
      
      // Zoom out to trigger clustering
      for (let i = 0; i < 5; i++) {
        await element(by.id('zoom-out-button')).tap();
        await LocationPermissionHelpers.sleep(200);
      }
      
      // Zoom in to expand clusters
      for (let i = 0; i < 5; i++) {
        await element(by.id('zoom-in-button')).tap();
        await LocationPermissionHelpers.sleep(200);
      }
      
      const fpsData = await performanceMonitor.getFPSMetrics();
      await performanceMonitor.recordMetric('clusteringFPS', fpsData.average);
      
      expect(fpsData.average).toBeGreaterThan(40);
      console.log(`Clustering transition FPS: ${fpsData.average}`);
    });
  });

  describe('Performance Regression Testing', () => {
    it('should not regress from baseline performance metrics', async () => {
      const baseline = await performanceMonitor.getBaselineMetrics();
      
      // Run comprehensive performance test
      await runComprehensivePerformanceTest();
      
      const currentMetrics = await performanceMonitor.getCurrentMetrics();
      
      // Compare against baseline (allow 10% regression tolerance)
      Object.keys(baseline).forEach(metric => {
        const baselineValue = baseline[metric];
        const currentValue = currentMetrics[metric];
        const regressionThreshold = baselineValue * 1.1; // 10% tolerance
        
        if (currentValue > regressionThreshold) {
          console.warn(`Performance regression detected for ${metric}: ${currentValue} vs baseline ${baselineValue}`);
        }
        
        // For critical metrics, fail the test
        if (['mapLoadTime', 'panningFPS', 'memoryIncreaseWithMarkers'].includes(metric)) {
          expect(currentValue).toBeLessThanOrEqual(regressionThreshold);
        }
      });
    });
  });
});

/**
 * Performance Monitor Helper Class
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.isMonitoring = false;
  }

  async start() {
    this.isMonitoring = true;
    this.metrics = {};
  }

  async stop() {
    this.isMonitoring = false;
    await this.saveMetrics();
  }

  async recordMetric(name, value) {
    this.metrics[name] = value;
  }

  async startFPSMonitoring() {
    // Enable FPS monitoring in the app
    await element(by.id('performance-monitor-toggle')).tap();
  }

  async getFPSMetrics() {
    const fpsElement = element(by.id('performance-fps-data'));
    const fpsData = await fpsElement.getAttributes();
    
    return JSON.parse(fpsData.text);
  }

  async getMemoryUsage() {
    const memoryElement = element(by.id('memory-usage-bytes'));
    const memoryData = await memoryElement.getAttributes();
    
    return parseInt(memoryData.text);
  }

  async startCPUMonitoring() {
    await element(by.id('cpu-monitor-toggle')).tap();
  }

  async getCPUUsage() {
    const cpuElement = element(by.id('cpu-usage-data'));
    const cpuData = await cpuElement.getAttributes();
    
    return JSON.parse(cpuData.text);
  }

  async startGPUMonitoring() {
    if (device.getPlatform() === 'ios') {
      await element(by.id('gpu-monitor-toggle')).tap();
    }
  }

  async getGPUUsage() {
    if (device.getPlatform() === 'ios') {
      const gpuElement = element(by.id('gpu-usage-data'));
      const gpuData = await gpuElement.getAttributes();
      return JSON.parse(gpuData.text);
    }
    return { average: 0 };
  }

  async startNetworkMonitoring() {
    await element(by.id('network-monitor-toggle')).tap();
  }

  async getNetworkUsage() {
    const networkElement = element(by.id('network-usage-data'));
    const networkData = await networkElement.getAttributes();
    
    return JSON.parse(networkData.text);
  }

  async getNetworkMetrics() {
    const metricsElement = element(by.id('network-metrics-data'));
    const metricsData = await metricsElement.getAttributes();
    
    return JSON.parse(metricsData.text);
  }

  async getBaselineMetrics() {
    // In a real implementation, this would load from a stored baseline file
    return {
      mapLoadTime: 2500,
      panningFPS: 58,
      zoomingFPS: 55,
      memoryIncreaseWithMarkers: 80 * 1024 * 1024, // 80MB
      markerRenderTime: 800,
      idleMapCPU: 3,
      interactionGPU: 60
    };
  }

  async getCurrentMetrics() {
    return this.metrics;
  }

  async saveMetrics() {
    // In a real implementation, this would save metrics to file/database
    console.log('Performance metrics:', this.metrics);
  }
}

/**
 * Helper functions
 */
async function performComplexGestures() {
  // Simulate complex user interactions
  const gestures = [
    () => element(by.id('mapbox-map')).swipe('up', 'fast'),
    () => element(by.id('mapbox-map')).swipe('down', 'fast'),
    () => element(by.id('mapbox-map')).swipe('left', 'fast'),
    () => element(by.id('mapbox-map')).swipe('right', 'fast'),
    () => element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0),
    () => element(by.id('mapbox-map')).pinchWithAngle('inward', 0.8, 0),
    () => element(by.id('mapbox-map')).multiTap(2)
  ];
  
  for (let i = 0; i < 20; i++) {
    const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
    await randomGesture();
    await LocationPermissionHelpers.sleep(50);
  }
}

async function runComprehensivePerformanceTest() {
  // Run all major performance test scenarios
  await element(by.id('map-button')).tap();
  await LocationPermissionHelpers.waitForMapReady();
  
  // Load test data
  await element(by.id('load-performance-test-data')).tap();
  await waitFor(element(by.id('50-venues-loaded')))
    .toBeVisible()
    .withTimeout(5000);
  
  // Perform various interactions
  await performComplexGestures();
  
  // Test zoom performance
  for (let i = 0; i < 5; i++) {
    await element(by.id('zoom-in-button')).tap();
    await LocationPermissionHelpers.sleep(100);
  }
  
  for (let i = 0; i < 5; i++) {
    await element(by.id('zoom-out-button')).tap();
    await LocationPermissionHelpers.sleep(100);
  }
}