/**
 * Cross-Platform Device Testing Matrix Configuration
 * Defines test devices, configurations, and requirements for iOS and Android
 */

export const DEVICE_TEST_MATRIX = {
  ios: {
    physical: [
      {
        name: 'iPhone 12',
        model: 'iPhone13,2',
        osVersion: '17.0',
        screenSize: { width: 390, height: 844 },
        screenDensity: 3.0,
        priority: 'high',
        testTypes: ['map-interactions', 'location-permissions', 'performance']
      },
      {
        name: 'iPhone 15 Pro',
        model: 'iPhone16,1', 
        osVersion: '18.0',
        screenSize: { width: 393, height: 852 },
        screenDensity: 3.0,
        priority: 'high',
        testTypes: ['map-interactions', 'location-permissions', 'performance', 'new-features']
      },
      {
        name: 'iPad Air',
        model: 'iPad13,1',
        osVersion: '17.0',
        screenSize: { width: 820, height: 1180 },
        screenDensity: 2.0,
        priority: 'medium',
        testTypes: ['map-interactions', 'tablet-layout']
      }
    ],
    simulators: [
      {
        name: 'iPhone SE (3rd gen)',
        model: 'iPhone14,6',
        osVersion: '16.0',
        screenSize: { width: 375, height: 667 },
        screenDensity: 2.0,
        priority: 'high',
        testTypes: ['small-screen', 'legacy-support']
      },
      {
        name: 'iPhone 14 Pro Max',
        model: 'iPhone15,3',
        osVersion: '17.0',
        screenSize: { width: 430, height: 932 },
        screenDensity: 3.0,
        priority: 'medium',
        testTypes: ['large-screen', 'map-interactions']
      },
      {
        name: 'iPad Pro 12.9"',
        model: 'iPad13,8',
        osVersion: '17.0',
        screenSize: { width: 1024, height: 1366 },
        screenDensity: 2.0,
        priority: 'low',
        testTypes: ['tablet-layout', 'large-screen']
      }
    ]
  },
  android: {
    physical: [
      {
        name: 'Samsung Galaxy S23',
        model: 'SM-S911U',
        osVersion: '13.0',
        apiLevel: 33,
        screenSize: { width: 411, height: 915 },
        screenDensity: 'xxhdpi',
        manufacturer: 'Samsung',
        priority: 'high',
        testTypes: ['map-interactions', 'location-permissions', 'performance', 'samsung-specific']
      },
      {
        name: 'Google Pixel 7',
        model: 'GVU6C',
        osVersion: '14.0',
        apiLevel: 34,
        screenSize: { width: 411, height: 869 },
        screenDensity: 'xxhdpi',
        manufacturer: 'Google',
        priority: 'high',
        testTypes: ['map-interactions', 'location-permissions', 'stock-android']
      },
      {
        name: 'OnePlus 11',
        model: 'CPH2449',
        osVersion: '13.0',
        apiLevel: 33,
        screenSize: { width: 412, height: 919 },
        screenDensity: 'xxhdpi',
        manufacturer: 'OnePlus',
        priority: 'medium',
        testTypes: ['map-interactions', 'oneplus-specific']
      }
    ],
    emulators: [
      {
        name: 'Pixel 3a API 29',
        model: 'pixel_3a',
        osVersion: '10.0',
        apiLevel: 29,
        screenSize: { width: 393, height: 808 },
        screenDensity: 'xxhdpi',
        priority: 'high',
        testTypes: ['legacy-support', 'backwards-compatibility']
      },
      {
        name: 'Pixel 5 API 31',
        model: 'pixel_5',
        osVersion: '12.0',
        apiLevel: 31,
        screenSize: { width: 393, height: 851 },
        screenDensity: 'xxhdpi',
        priority: 'high',
        testTypes: ['map-interactions', 'location-permissions']
      },
      {
        name: 'Pixel Tablet API 34',
        model: 'pixel_tablet',
        osVersion: '14.0',
        apiLevel: 34,
        screenSize: { width: 1280, height: 800 },
        screenDensity: 'hdpi',
        priority: 'medium',
        testTypes: ['tablet-layout', 'large-screen']
      }
    ]
  }
};

export const TEST_CONFIGURATIONS = {
  'map-interactions': {
    description: 'Core map functionality testing',
    testFiles: ['map-interactions.test.js'],
    timeout: 30000,
    retry: 2,
    requirements: ['GPS', 'Network']
  },
  'location-permissions': {
    description: 'Location permission handling tests',
    testFiles: ['location-permissions.test.js'],
    timeout: 20000,
    retry: 3,
    requirements: ['GPS', 'Location Services']
  },
  'performance': {
    description: 'Map performance and memory testing',
    testFiles: ['performance-tests.test.js'],
    timeout: 60000,
    retry: 1,
    requirements: ['Performance Monitoring', 'Memory Profiling']
  },
  'small-screen': {
    description: 'Small screen layout testing',
    testFiles: ['responsive-layout.test.js'],
    timeout: 15000,
    retry: 2,
    requirements: ['UI Automation']
  },
  'large-screen': {
    description: 'Large screen and tablet testing',
    testFiles: ['tablet-layout.test.js'],
    timeout: 20000,
    retry: 2,
    requirements: ['UI Automation']
  },
  'tablet-layout': {
    description: 'Tablet-specific layout testing',
    testFiles: ['tablet-specific.test.js'],
    timeout: 25000,
    retry: 2,
    requirements: ['Tablet Mode', 'UI Automation']
  },
  'samsung-specific': {
    description: 'Samsung device specific tests',
    testFiles: ['samsung-device.test.js'],
    timeout: 20000,
    retry: 2,
    requirements: ['Samsung Services']
  },
  'stock-android': {
    description: 'Stock Android experience tests',
    testFiles: ['stock-android.test.js'],
    timeout: 20000,
    retry: 2,
    requirements: ['Stock Android']
  },
  'legacy-support': {
    description: 'Backwards compatibility testing',
    testFiles: ['legacy-compatibility.test.js'],
    timeout: 25000,
    retry: 3,
    requirements: ['Legacy APIs']
  },
  'new-features': {
    description: 'Latest iOS/Android feature testing',
    testFiles: ['new-features.test.js'],
    timeout: 20000,
    retry: 2,
    requirements: ['Latest OS Features']
  }
};

export const PLATFORM_SPECIFIC_CONFIGS = {
  ios: {
    testRunner: 'detox',
    buildConfiguration: 'Debug',
    simulatorConfig: {
      type: 'ios.simulator',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Hooked.app',
      build: 'xcodebuild -workspace ios/Hooked.xcworkspace -scheme Hooked -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    deviceConfig: {
      type: 'ios.device',
      binaryPath: 'ios/build/Build/Products/Debug-iphoneos/Hooked.app',
      build: 'xcodebuild -workspace ios/Hooked.xcworkspace -scheme Hooked -configuration Debug -sdk iphoneos -derivedDataPath ios/build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO'
    },
    capabilities: {
      location: 'NSLocationWhenInUseUsageDescription',
      camera: 'NSCameraUsageDescription',
      notifications: 'Push Notifications'
    }
  },
  android: {
    testRunner: 'detox',
    buildConfiguration: 'debug',
    emulatorConfig: {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      utilBinaryPaths: ['android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk']
    },
    deviceConfig: {
      type: 'android.attached',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    },
    capabilities: {
      location: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      camera: 'CAMERA',
      network: 'INTERNET'
    }
  }
};

export const CI_PIPELINE_CONFIG = {
  github_actions: {
    ios: {
      'macos-latest': {
        xcode_version: '15.0',
        ios_simulator: 'iPhone 15 Pro (17.0)',
        test_parallelization: 2,
        test_timeout: 45
      }
    },
    android: {
      'ubuntu-latest': {
        api_level: [29, 31, 33],
        arch: 'x86_64',
        test_parallelization: 3,
        test_timeout: 45
      }
    }
  },
  device_farm: {
    aws_device_farm: {
      project_name: 'Hooked-Mapbox-Testing',
      ios_devices: [
        'iPhone 12 (iOS 17.0)',
        'iPhone 15 Pro (iOS 18.0)',
        'iPad Air (iOS 17.0)'
      ],
      android_devices: [
        'Samsung Galaxy S23 (Android 13)',
        'Google Pixel 7 (Android 14)',
        'OnePlus 11 (Android 13)'
      ],
      test_timeout: 60,
      parallel_executions: 5
    }
  }
};

export const PERFORMANCE_BENCHMARKS = {
  mapLoadTime: {
    target: 3000, // 3 seconds
    warning: 5000,
    critical: 8000
  },
  markerRenderTime: {
    target: 1000, // 1 second for 50+ markers
    warning: 2000,
    critical: 5000
  },
  frameRate: {
    target: 55, // FPS during interactions
    warning: 45,
    critical: 30
  },
  memoryUsage: {
    target: 100, // MB max increase
    warning: 150,
    critical: 200
  },
  batteryImpact: {
    target: 5, // % battery drain per hour
    warning: 10,
    critical: 20
  }
};

export const TEST_DATA_SETS = {
  venue_density: {
    low: 5, // 5 venues in viewport
    medium: 25, // 25 venues in viewport
    high: 75, // 75 venues requiring clustering
    stress: 150 // Stress test scenario
  },
  location_scenarios: {
    urban: { lat: 40.7128, lng: -74.0060 }, // NYC
    suburban: { lat: 37.7749, lng: -122.4194 }, // San Francisco
    rural: { lat: 44.9778, lng: -93.2650 }, // Minneapolis
    international: { lat: 51.5074, lng: -0.1278 } // London
  },
  network_conditions: [
    'wifi',
    'slow-3g',
    '2g',
    'offline'
  ]
};

/**
 * Generate test execution matrix for CI/CD
 */
export function generateTestMatrix() {
  const matrix = [];
  
  // iOS physical devices (high priority)
  DEVICE_TEST_MATRIX.ios.physical
    .filter(device => device.priority === 'high')
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'ios',
          device: device.name,
          deviceType: 'physical',
          testType: testType,
          config: TEST_CONFIGURATIONS[testType]
        });
      });
    });
  
  // iOS simulators (medium priority)
  DEVICE_TEST_MATRIX.ios.simulators
    .filter(device => device.priority === 'high')
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'ios',
          device: device.name,
          deviceType: 'simulator',
          testType: testType,
          config: TEST_CONFIGURATIONS[testType]
        });
      });
    });
  
  // Android physical devices (high priority)
  DEVICE_TEST_MATRIX.android.physical
    .filter(device => device.priority === 'high')
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'android',
          device: device.name,
          deviceType: 'physical',
          testType: testType,
          config: TEST_CONFIGURATIONS[testType]
        });
      });
    });
  
  // Android emulators (high priority)
  DEVICE_TEST_MATRIX.android.emulators
    .filter(device => device.priority === 'high')
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'android',
          device: device.name,
          deviceType: 'emulator',
          testType: testType,
          config: TEST_CONFIGURATIONS[testType]
        });
      });
    });
  
  return matrix;
}

/**
 * Get device-specific test configuration
 */
export function getDeviceConfig(platform, deviceName, deviceType) {
  const devices = DEVICE_TEST_MATRIX[platform][deviceType === 'physical' ? 'physical' : (deviceType === 'simulator' ? 'simulators' : 'emulators')];
  return devices.find(device => device.name === deviceName);
}

/**
 * Validate test requirements for device
 */
export function validateDeviceRequirements(device, testType) {
  const config = TEST_CONFIGURATIONS[testType];
  const requirements = config.requirements;
  
  const issues = [];
  
  requirements.forEach(requirement => {
    switch (requirement) {
      case 'GPS':
        if (device.deviceType === 'emulator' && !device.hasGPS) {
          issues.push('GPS simulation required for emulator');
        }
        break;
      case 'Performance Monitoring':
        if (device.deviceType !== 'physical' && testType === 'performance') {
          issues.push('Physical device recommended for performance testing');
        }
        break;
      case 'Tablet Mode':
        if (device.screenSize.width < 768) {
          issues.push('Device screen too small for tablet testing');
        }
        break;
    }
  });
  
  return issues;
}

export default {
  DEVICE_TEST_MATRIX,
  TEST_CONFIGURATIONS,
  PLATFORM_SPECIFIC_CONFIGS,
  CI_PIPELINE_CONFIG,
  PERFORMANCE_BENCHMARKS,
  TEST_DATA_SETS,
  generateTestMatrix,
  getDeviceConfig,
  validateDeviceRequirements
};