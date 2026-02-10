declare module 'postal' {
  interface PostalChannel {
    subscribe(eventId: string, callback: (data: any, envelope: any) => void): {
      unsubscribe: () => void;
      [key: string]: any;
    };
    publish(eventId: string, data?: any): void;
    [key: string]: any;
  }

  interface Postal {
    channel(name: string): PostalChannel;
    [key: string]: any;
  }

  const postal: Postal;
  export = postal;
}