/**
 * Detox Configuration for Cross-Platform Testing
 * Supports iOS simulators/devices and Android emulators/devices
 */

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: '__tests__/config/jest.config.js'
    },
    jest: {
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js']
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Hooked.app',
      build: 'xcodebuild -workspace ios/Hooked.xcworkspace -scheme Hooked -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/Hooked.app',
      build: 'xcodebuild -workspace ios/Hooked.xcworkspace -scheme Hooked -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.device.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphoneos/Hooked.app',
      build: 'xcodebuild -workspace ios/Hooked.xcworkspace -scheme Hooked -configuration Debug -sdk iphoneos -derivedDataPath ios/build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk'
    }
  },
  devices: {
    // iOS Simulators
    'ios.sim.iphone12': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 12',
        os: '17.0'
      }
    },
    'ios.sim.iphone15pro': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
        os: '18.0'
      }
    },
    'ios.sim.iphone14promax': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14 Pro Max',
        os: '17.0'
      }
    },
    'ios.sim.iphonese': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone SE (3rd generation)',
        os: '16.0'
      }
    },
    'ios.sim.ipadair': {
      type: 'ios.simulator',
      device: {
        type: 'iPad Air (5th generation)',
        os: '17.0'
      }
    },
    // iOS Physical Devices
    'ios.device': {
      type: 'ios.device',
      device: {
        name: process.env.IOS_DEVICE_NAME || 'iPhone'
      }
    },
    // Android Emulators
    'android.emu.pixel3a': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_3a_API_29'
      }
    },
    'android.emu.pixel5': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31'
      }
    },
    'android.emu.pixel7': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_33'
      }
    },
    'android.emu.tablet': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_Tablet_API_34'
      }
    },
    // Android Physical Devices
    'android.device': {
      type: 'android.attached',
      device: {
        adbName: process.env.ANDROID_DEVICE_ADB || '.*' // Use any connected device
      }
    }
  },
  configurations: {
    // iOS Configurations
    'ios.sim.debug': {
      device: 'ios.sim.iphone15pro',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'ios.sim.iphone15pro',
      app: 'ios.release'
    },
    'ios.sim.iphone12': {
      device: 'ios.sim.iphone12',
      app: 'ios.debug'
    },
    'ios.sim.iphonese': {
      device: 'ios.sim.iphonese',
      app: 'ios.debug'
    },
    'ios.sim.ipadair': {
      device: 'ios.sim.ipadair',
      app: 'ios.debug'
    },
    'ios.device.debug': {
      device: 'ios.device',
      app: 'ios.device.debug'
    },
    // Android Configurations
    'android.emu.debug': {
      device: 'android.emu.pixel7',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'android.emu.pixel7',
      app: 'android.release'
    },
    'android.emu.pixel3a': {
      device: 'android.emu.pixel3a',
      app: 'android.debug'
    },
    'android.emu.pixel5': {
      device: 'android.emu.pixel5',
      app: 'android.debug'
    },
    'android.emu.tablet': {
      device: 'android.emu.tablet',
      app: 'android.debug'
    },
    'android.device.debug': {
      device: 'android.device',
      app: 'android.debug'
    },
    // Cross-platform configurations for CI/CD
    'ci.ios': {
      device: 'ios.sim.iphone15pro',
      app: 'ios.release'
    },
    'ci.android': {
      device: 'android.emu.pixel7',
      app: 'android.release'
    }
  },
  session: {
    server: 'ws://localhost:8099',
    sessionId: 'HookedMapboxTesting'
  },
  behavior: {
    init: {
      reinstallApp: true,
      exposeGlobals: false
    },
    cleanup: {
      shutdownDevice: false
    }
  },
  logger: {
    level: process.env.DETOX_LOG_LEVEL || 'info',
    overrideConsole: true,
    printBuildLogs: true
  },
  artifacts: {
    rootDir: '__tests__/artifacts',
    pathBuilder: './__tests__/config/pathBuilder.js',
    plugins: {
      log: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false
      },
      screenshot: {
        enabled: true,
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: false,
        takeWhen: {
          testStart: true,
          testDone: true,
          appNotReady: true
        }
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,
        android: {
          bitRate: 4000000
        },
        simulator: {
          codec: 'hevc'
        }
      },
      instruments: {
        enabled: process.env.CI ? false : true,
        keepOnlyFailedTestsArtifacts: false
      },
      timeline: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false
      }
    }
  },
  // Custom configurations for Mapbox testing
  mapbox: {
    testDataPath: '__tests__/fixtures/mapbox-test-data.json',
    mockLocationAccuracy: 10, // meters
    performanceThresholds: {
      mapLoadTime: 3000,
      markerRenderTime: 1000,
      frameRate: 55,
      memoryIncrease: 100
    }
  }
};