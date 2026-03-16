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
