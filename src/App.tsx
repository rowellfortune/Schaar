import { useState, useRef, useEffect } from 'react';
import './App.css';
import { initDevTools } from './devTools';

interface SerialPort {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  close(): Promise<void>;
}

const styles = {
  container: { fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', maxWidth: '600px', margin: '40px auto', padding: '20px', textAlign: 'center' as const, backgroundColor: '#f9f9f9', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  statusBadge: (connected: boolean) => ({ padding: '8px 15px', borderRadius: '20px', backgroundColor: connected ? '#d4edda' : '#f8d7da', color: connected ? '#155724' : '#721c24', fontSize: '0.9em', marginBottom: '20px', display: 'inline-block' as const }),
  weightDisplay: { display: 'flex' as const, justifyContent: 'space-around', margin: '30px 0' },
  card: (active: boolean) => ({ padding: '20px', border: `2px solid ${active ? '#007bff' : '#eee'}`, borderRadius: '10px', backgroundColor: active ? '#fff' : '#f1f1f1', width: '40%', transition: 'all 0.3s' }),
  resultBox: { marginTop: '30px', padding: '20px', backgroundColor: '#007bff', color: 'white', borderRadius: '10px', fontSize: '1.5em', fontWeight: 'bold' },
  button: { padding: '12px 24px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', transition: 'background 0.3s' },
  resetBtn: { marginTop: '15px', background: 'none', border: '1px solid white', color: 'white', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px' }
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [droog, setDroog] = useState<number | null>(null);
  const [nat, setNat] = useState<number | null>(null);
  const [resultaat, setResultaat] = useState<string | null>(null);
  const portRef = useRef<SerialPort | null>(null);

  const bereken = (d: number, n: number): number => ((n / d) * 2307.454) - 2088.136;

  const verwerkMeting = (g: number): void => {
    setDroog(prevDroog => {
      if (prevDroog === null) return g;
      setNat(prevNat => {
        if (prevNat === null) {
          const res = bereken(prevDroog, g);
          setResultaat(res.toFixed(2));
          return g;
        }
        return prevNat;
      });
      return prevDroog;
    });
  };

  useEffect(() => {
    initDevTools(verwerkMeting);
  }, []);

  const connectSerial = async () => {
    try {
      const port = await navigator.serial.requestPort();
      // CRITICAL: Added dataBits: 7 and parity: 'even' to fix the "missing digits" issue
      await (port.open as any)({
        baudRate: 2400,
        dataBits: 7,
        stopBits: 1,
        parity: 'even'
      });
      portRef.current = port;
      setConnected(true);
      leesData();
    } catch (err) {
      console.error("Verbinding mislukt:", err);
    }
  };

  const leesData = async (): Promise<void> => {
    if (!portRef.current) return;

    // Use TextDecoderStream and a pipe to handle incoming text chunks correctly
    const textDecoder = new TextDecoderStream();
    portRef.current.readable.pipeTo(textDecoder.writable as any);
    const reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        if (value) {
          buffer += value;
          // The balance sends a CR (Carriage Return) at the end of each line
          const lines = buffer.split('\r'); 
          buffer = lines.pop() || ''; // Keep the last partial line in the buffer

          for (const line of lines) {
            // Clean the string: remove headers (ST, QT, etc) and units (g)
            const cleanValue = line.replace(/[^\d.-]/g, '');
            const gewicht = parseFloat(cleanValue);

            if (!isNaN(gewicht) && gewicht !== 0) {
              verwerkMeting(gewicht);
            }
          }
        }
      }
    } catch (err) {
      console.error("Fout bij lezen:", err);
      setConnected(false);
    } finally {
      reader.releaseLock();
    }
  };

  const reset = () => {
    setDroog(null);
    setNat(null);
    setResultaat(null);
  };

  return (
    <div style={styles.container}>
    <div><img src="/src/assets/logo.png" alt="Logo"  width={200}/></div>
      <h2>⚖️ A&D Precision App</h2>
      <div style={styles.statusBadge(connected)}>
        {connected ? '● Weegschaal Verbonden' : '○ Geen verbinding'}
      </div>

      {!connected && (
        <button onClick={connectSerial} style={styles.button}>Verbind via USB</button>
      )}

      <div style={styles.weightDisplay}>
        <div style={styles.card(droog !== null && nat === null)}>
          <small>STAP 1</small>
          <h4>Droog</h4>
          <p style={{fontSize: '1.2em'}}>{droog ? `${droog} g` : '---'}</p>
        </div>
        <div style={styles.card(nat !== null)}>
          <small>STAP 2</small>
          <h4>Nat</h4>
          <p style={{fontSize: '1.2em'}}>{nat ? `${nat} g` : '---'}</p>
        </div>
      </div>

      {resultaat && (
        <div style={styles.resultBox}>
          <div>{resultaat} %</div>
          <button onClick={reset} style={styles.resetBtn}>Nieuwe meting</button>
        </div>
      )}

      <p style={{marginTop: '20px', fontSize: '0.8em', color: '#666'}}>
        Status: 2400 Baud, 7E1. Zorg dat de weegschaal op <strong>Auto-Print</strong> staat.
      </p>
    </div>
  );
}
