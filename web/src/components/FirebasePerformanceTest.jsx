import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getFirebasePerformanceReport, 
  exportFirebaseMetrics,
  cleanupListeners 
} from '@/api/entities';

export default function FirebasePerformanceTest() {
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update report every 5 seconds when visible
    if (isVisible) {
      const interval = setInterval(() => {
        const currentReport = getFirebasePerformanceReport();
        setReport(currentReport);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleExportMetrics = () => {
    const exportedMetrics = exportFirebaseMetrics();
    setMetrics(exportedMetrics);
    console.log('📊 Exported Firebase Metrics:', exportedMetrics);
  };

  const handleCleanupListeners = () => {
    cleanupListeners();
    console.log('🧹 All listeners cleaned up');
    // Update report after cleanup
    setTimeout(() => {
      setReport(getFirebasePerformanceReport());
    }, 1000);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white dark:bg-gray-800 shadow-lg"
        >
          📊 Performance
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-white dark:bg-gray-800 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Firebase Performance</span>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Listeners:</span>
                <span className="font-mono">{report.current.listenerCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Memory:</span>
                <span className="font-mono">{report.current.memoryUsage}</span>
              </div>
              <div className="flex justify-between">
                <span>Memory %:</span>
                <span className="font-mono">{report.current.memoryPercentage}</span>
              </div>
              
              {report.recommendations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                    Recommendations:
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {report.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleExportMetrics}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              Export
            </Button>
            <Button
              onClick={handleCleanupListeners}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              Cleanup
            </Button>
          </div>
          
          {metrics && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 dark:text-gray-400">
                View Metrics
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(metrics, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 