interface SerialPortOpenOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
}

interface SerialPort {
  open(options: SerialPortOpenOptions): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  close(): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  readonly serial: Serial;
}
