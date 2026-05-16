declare module 'simple-peer' {
  type SignalData = unknown;

  interface PeerOptions {
    initiator?: boolean;
    trickle?: boolean;
    stream?: MediaStream;
  }

  class SimplePeer {
    constructor(options?: PeerOptions);
    on(event: 'signal', cb: (data: SignalData) => void): void;
    on(event: 'stream', cb: (stream: MediaStream) => void): void;
    signal(data: SignalData): void;
    destroy(): void;
  }

  export default SimplePeer;
}
