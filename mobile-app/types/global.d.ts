declare global {
  // eslint-disable-next-line no-unused-vars
  var global: typeof globalThis;
  
  interface Global {
    eventEmitter?: {
      on: (_event: string, _handler: (..._args: any[]) => void) => void;
      off: (_event: string, _handler: (..._args: any[]) => void) => void;
      emit: (_event: string, ..._args: any[]) => void;
    };
    performance?: {
      memory?: {
        usedJSHeapSize?: number;
      };
    };
    onunhandledrejection?: (_event: any) => void;
  }
  
  // eslint-disable-next-line no-unused-vars
  var eventEmitter: Global['eventEmitter'];
  // eslint-disable-next-line no-unused-vars
  var performance: Global['performance'];
  // eslint-disable-next-line no-unused-vars
  var onunhandledrejection: Global['onunhandledrejection'];
}

export {};
