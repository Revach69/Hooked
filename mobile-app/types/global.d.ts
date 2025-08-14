declare global {
  var global: typeof globalThis;
  
  interface Global {
    eventEmitter?: {
      on: (event: string, handler: (...args: any[]) => void) => void;
      off: (event: string, handler: (...args: any[]) => void) => void;
      emit: (event: string, ...args: any[]) => void;
    };
    performance?: {
      memory?: {
        usedJSHeapSize?: number;
      };
    };
    onunhandledrejection?: (event: any) => void;
  }
  
  var eventEmitter: Global['eventEmitter'];
  var performance: Global['performance'];
  var onunhandledrejection: Global['onunhandledrejection'];
}

export {};
