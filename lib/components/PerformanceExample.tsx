import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

export const PerformanceExample: React.FC = () => {
  const { 
    trackUserInteraction, 
    stopUserInteraction, 
    trackAsyncOperation,
    trackCustomMetric,
    trackCustomAttribute 
  } = usePerformanceMonitoring({ 
    screenName: 'performance_example',
    enableScreenTracking: true,
    enableUserInteractionTracking: true 
  });

  const handleButtonPress = async () => {
    // Start tracking user interaction
    await trackUserInteraction('button_press', { 
      button_name: 'example_button',
      action: 'demo_click' 
    });

    try {
      // Simulate an async operation
      await trackAsyncOperation('demo_operation', async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, data: 'example data' };
      }, { operation_type: 'demo', complexity: 'simple' });

      // Track custom metrics
      await trackCustomMetric('button_clicks', 1);
      await trackCustomMetric('successful_operations', 1);

      // Track custom attributes
      await trackCustomAttribute('last_action', 'button_press');
      await trackCustomAttribute('user_status', 'active');

      // Performance tracking completed successfully
    } catch (error) {
      console.error('Error in performance tracking:', error);
      
      // Track error metric
      await trackCustomMetric('operation_errors', 1);
    } finally {
      // Stop the interaction trace
      await stopUserInteraction('button_press');
    }
  };

  const handleNetworkRequest = async () => {
    await trackUserInteraction('network_request', { 
      request_type: 'demo_api_call' 
    });

    try {
      // Simulate a network request
      await trackAsyncOperation('demo_network_request', async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return { status: 200, data: 'response data' };
      }, { endpoint: '/api/demo', method: 'GET' });

      await trackCustomMetric('network_requests', 1);
      // Network request tracked successfully
    } catch (error) {
      console.error('Network request failed:', error);
      await trackCustomMetric('network_errors', 1);
    } finally {
      await stopUserInteraction('network_request');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Monitoring Example</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleButtonPress}>
        <Text style={styles.buttonText}>Track Button Press</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleNetworkRequest}>
        <Text style={styles.buttonText}>Track Network Request</Text>
      </TouchableOpacity>

      <Text style={styles.description}>
        Check the console for performance tracking logs.
        View detailed metrics in Firebase Console → Performance.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PerformanceExample; 