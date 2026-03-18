declare module 'ros2d' {
  class Viewer {
    constructor(options: { divID: string; width: number; height: number });
    scene: any;
    scaleToDimensions(width: number, height: number): void;
    shift(x: number, y: number): void;
  }
  class OccupancyGridClient {
    constructor(options: { ros: any; topic: string; rootObject: any; continuous?: boolean });
    currentGrid: any;
    on(event: 'change', cb: () => void): void;
  }
  export { Viewer, OccupancyGridClient };
}

declare module 'roslib' {
  export = ROSLIB;
}

declare namespace ROSLIB {
  class Ros {
    constructor(options: { url: string });
    on(event: string, callback: (arg?: any) => void): void;
    connect(url: string): void;
    close(): void;
  }

  class Topic {
    name: string;
    messageType: string;
    constructor(options: { ros: Ros; name: string; messageType: string });
    subscribe(callback: (message: any) => void): void;
    unsubscribe(): void;
    publish(message: Message): void;
  }

  class Message {
    constructor(values: Record<string, any>);
    [key: string]: any;
  }

  class Param {
    constructor(options: { ros: Ros; name: string });
    get(callback: (value: any) => void): void;
    set(value: any, callback?: () => void): void;
  }
}
