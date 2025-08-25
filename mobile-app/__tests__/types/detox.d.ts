/**
 * TypeScript definitions for Detox testing framework
 * Extends the global types for better test file type safety
 */

declare global {
  namespace Detox {
    interface Device {
      getPlatform(): 'ios' | 'android';
      setNetworkConditions(condition: 'wifi' | 'slow-3g' | '2g' | 'airplane'): Promise<void>;
      setPermissions(permissions: { location?: 'always' | 'inuse' | 'never' | 'unset' }): Promise<void>;
      setLocation(latitude: number, longitude: number, options?: { 
        horizontalAccuracy?: number;
        verticalAccuracy?: number;
      }): Promise<void>;
      sendMemoryWarning(): Promise<void>;
      sendToHome(): Promise<void>;
      getElementCount(): Promise<number>;
    }

    interface Element {
      getElementCount(): Promise<number>;
      pinchWithAngle(direction: 'outward' | 'inward', scale: number, angle: number): Promise<void>;
    }

    interface Attributes {
      text: string;
      value: string;
      style?: string;
      coordinates?: string;
    }
  }
}

export {};